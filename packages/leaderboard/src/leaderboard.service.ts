import { TRPCError } from '@trpc/server';
import { createId } from '@paralleldrive/cuid2';
import type { AuthUser } from '@awaaz/types';
import type {
  AuthorityLeaderboardDetail,
  AuthorityScoreMetrics,
  ConstituencyLeaderboardDetail,
  ConstituencyScoreMetrics,
  GenerationResult,
  GetEntityDetailsInput,
  GetLeaderboardInput,
  GetMostImprovedInput,
  GetTopPerformersInput,
  LeaderboardEntityType,
  LeaderboardEntry,
  LeaderboardListResult,
  LeaderboardPeriodType,
  MostImprovedEntry,
  TriggerGenerationInput,
} from '@awaaz/types';
import {
  LEADERBOARD_ERROR,
  MIN_COMPLAINTS_FOR_AUTHORITY_RANKING,
  MIN_COMPLAINTS_FOR_CONSTITUENCY_RANKING,
  RANK_HISTORY_PERIODS,
  SCORE_VERSION,
} from './leaderboard.constants.js';
import {
  applyBayesianSmoothing,
  assignDenseRanks,
  computeAuthorityScore,
  computeConstituencyScore,
  computeMostImproved,
  getPeriodWindow,
} from './leaderboard.utils.js';
import type { LeaderboardRepository } from './leaderboard.repository.js';

// ---------------------------------------------------------------------------
// cuid2 is used for generation batch IDs — shorter and URL-safe
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Leaderboard Service
//
// Two concerns:
//   1. Generation — batch score computation and snapshot persistence.
//      Called by the BullMQ job (or admin via triggerGeneration).
//   2. Read API — tRPC-facing procedures for fetching published leaderboards.
// ---------------------------------------------------------------------------

export class LeaderboardService {
  constructor(private readonly repo: LeaderboardRepository) {}

  // =========================================================================
  // 1. Generation — Authority Leaderboard
  // =========================================================================

  /**
   * Generates and persists authority scores for a given period.
   *
   * Steps:
   *   1. Resolve the period window (dateFrom / dateTo)
   *   2. Guard: skip if already generated for this period
   *   3. Fetch all authority metrics in one query
   *   4. Compute a score for each authority
   *   5. Apply Bayesian smoothing using the previous period's mean
   *   6. Assign dense ranks
   *   7. Bulk-insert all snapshots (isPublished = false)
   *   8. Flip the batch live atomically
   *
   * Returns the number of authorities scored.
   */
  async generateAuthorityLeaderboard(
    periodType: LeaderboardPeriodType,
    referenceDate?: Date,
  ): Promise<number> {
    const { periodStart, periodEnd } = getPeriodWindow(periodType, referenceDate);

    // Idempotency guard
    const exists = await this.repo.snapshotExists('AUTHORITY', periodType, periodStart);
    if (exists) return 0;

    const batchId = createId();
    const now = new Date();

    // Fetch prior platform mean for Bayesian smoothing
    const platformMean = await this.repo.getPlatformMeanScore('AUTHORITY', periodType, periodStart);

    // Fetch raw per-authority metrics
    const rows = await this.repo.getAuthorityMetricsForGeneration(periodStart, periodEnd);

    // Score each authority
    const scored: Array<{
      entityId: string;
      entityName: string;
      score: number;
      metrics: AuthorityScoreMetrics;
      sampleSize: number;
    }> = [];

    for (const row of rows) {
      const assignedCount = Number(row.assigned_count);
      if (assignedCount < MIN_COMPLAINTS_FOR_AUTHORITY_RANKING) continue;

      const rawMetrics: AuthorityScoreMetrics['rawMetrics'] = {
        assignedCount,
        resolvedCount: Number(row.resolved_count),
        verifiedCount: Number(row.verified_count),
        rejectedCount: Number(row.rejected_count),
        openCount: Number(row.open_count),
        overdueCount: Number(row.overdue_count),
        autoAssignedCount: Number(row.auto_assigned_count),
        medianResolutionTimeHours:
          row.median_resolution_hours != null ? Number(row.median_resolution_hours) : null,
      };

      const { score, components } = computeAuthorityScore(rawMetrics, platformMean);
      const smoothedScore = applyBayesianSmoothing(score, assignedCount, platformMean);

      scored.push({
        entityId: row.authority_id,
        entityName: row.authority_name,
        score: smoothedScore,
        metrics: components,
        sampleSize: assignedCount,
      });
    }

    if (scored.length === 0) return 0;

    // Sort descending by score, assign dense ranks
    scored.sort((a, b) => b.score - a.score);
    const ranked = assignDenseRanks(scored);

    // Bulk insert
    await this.repo.createSnapshotsBatch(
      ranked.map((entry) => ({
        entityType: 'AUTHORITY' as const,
        entityId: entry.entityId,
        entityName: entry.entityName,
        score: entry.score,
        rank: entry.rank,
        metrics: entry.metrics,
        scoreVersion: SCORE_VERSION,
        periodType,
        periodStart,
        periodEnd,
        generationBatch: batchId,
      })),
    );

    // Atomic publication
    await this.repo.publishBatch(batchId);

    console.log(
      `[Leaderboard] Authority ${periodType} generation complete:`,
      `${ranked.length} authorities scored, batch=${batchId}, took=${Date.now() - now.getTime()}ms`,
    );

    return ranked.length;
  }

  // =========================================================================
  // 2. Generation — Constituency Leaderboard
  // =========================================================================

  async generateConstituencyLeaderboard(
    periodType: LeaderboardPeriodType,
    referenceDate?: Date,
  ): Promise<number> {
    const { periodStart, periodEnd } = getPeriodWindow(periodType, referenceDate);

    const exists = await this.repo.snapshotExists('CONSTITUENCY', periodType, periodStart);
    if (exists) return 0;

    const batchId = createId();
    const now = new Date();

    const platformMean = await this.repo.getPlatformMeanScore(
      'CONSTITUENCY',
      periodType,
      periodStart,
    );

    const rows = await this.repo.getConstituencyMetricsForGeneration(periodStart, periodEnd);

    // Compute platform-wide median complaint volume for participation score
    const volumes = rows.map((r) => Number(r.total));
    const participationMedian = computeMedian(volumes) ?? 1;

    const scored: Array<{
      entityId: string;
      entityName: string;
      score: number;
      metrics: ConstituencyScoreMetrics;
      sampleSize: number;
    }> = [];

    for (const row of rows) {
      const total = Number(row.total);
      if (total < MIN_COMPLAINTS_FOR_CONSTITUENCY_RANKING) continue;

      const rawMetrics: ConstituencyScoreMetrics['rawMetrics'] = {
        totalComplaints: total,
        resolvedCount: Number(row.resolved_count),
        verifiedCount: Number(row.verified_count),
        openCount: Number(row.open_count),
        autoAssignedCount: Number(row.auto_assigned_count),
        totalAssignedCount: Number(row.total_assigned_count),
      };

      const { score, components } = computeConstituencyScore(rawMetrics, participationMedian);
      const smoothedScore = applyBayesianSmoothing(score, total, platformMean);

      scored.push({
        entityId: row.constituency_id,
        entityName: row.constituency_name,
        score: smoothedScore,
        metrics: components,
        sampleSize: total,
      });
    }

    if (scored.length === 0) return 0;

    scored.sort((a, b) => b.score - a.score);
    const ranked = assignDenseRanks(scored);

    await this.repo.createSnapshotsBatch(
      ranked.map((entry) => ({
        entityType: 'CONSTITUENCY' as const,
        entityId: entry.entityId,
        entityName: entry.entityName,
        score: entry.score,
        rank: entry.rank,
        metrics: entry.metrics,
        scoreVersion: SCORE_VERSION,
        periodType,
        periodStart,
        periodEnd,
        generationBatch: batchId,
      })),
    );

    await this.repo.publishBatch(batchId);

    console.log(
      `[Leaderboard] Constituency ${periodType} generation complete:`,
      `${ranked.length} constituencies scored, batch=${batchId}, took=${Date.now() - now.getTime()}ms`,
    );

    return ranked.length;
  }

  // =========================================================================
  // 3. Admin trigger — generates both entity types for a period
  // =========================================================================

  async triggerGeneration(
    actor: AuthUser,
    input: TriggerGenerationInput,
  ): Promise<GenerationResult> {
    if (actor.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: LEADERBOARD_ERROR.FORBIDDEN });
    }

    const startMs = Date.now();
    const { periodType } = input;
    const { periodStart, periodEnd } = getPeriodWindow(periodType);
    const batchId = createId();

    const [authoritiesScored, constituenciesScored] = await Promise.all([
      this.generateAuthorityLeaderboard(periodType),
      this.generateConstituencyLeaderboard(periodType),
    ]);

    return {
      batchId,
      periodType,
      periodStart,
      periodEnd,
      authoritiesScored,
      constituenciesScored,
      durationMs: Date.now() - startMs,
    };
  }

  // =========================================================================
  // 4. tRPC-facing reads — all public (no auth scoping on reads)
  // =========================================================================

  async getAuthorities(input: GetLeaderboardInput): Promise<LeaderboardListResult> {
    return this.repo.getLatestPublishedLeaderboard(
      'AUTHORITY',
      input.periodType ?? 'MONTHLY',
      input.page ?? 1,
      input.limit ?? 20,
      false, // metrics not included in list view — only in detail view
    );
  }

  async getConstituencies(input: GetLeaderboardInput): Promise<LeaderboardListResult> {
    return this.repo.getLatestPublishedLeaderboard(
      'CONSTITUENCY',
      input.periodType ?? 'MONTHLY',
      input.page ?? 1,
      input.limit ?? 20,
      false,
    );
  }

  async getAuthorityDetails(
    actor: AuthUser,
    input: GetEntityDetailsInput,
  ): Promise<AuthorityLeaderboardDetail> {
    // MLA can see full metrics breakdown for themselves only
    // Admin can see full metrics for any authority
    // All others see null metrics (public score + rank only)
    const includeMetrics =
      actor.role === 'admin' || (actor.role === 'mla' && actor.id === input.entityId);

    const current = await this.repo.getLatestSnapshotForEntity(
      input.entityId,
      'AUTHORITY',
      input.periodType ?? 'MONTHLY',
      includeMetrics,
    );

    if (!current) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: LEADERBOARD_ERROR.SNAPSHOT_NOT_FOUND,
      });
    }

    const rankHistory = await this.repo.getRankHistory(
      input.entityId,
      'AUTHORITY',
      input.periodType ?? 'MONTHLY',
      RANK_HISTORY_PERIODS,
    );

    return { current, rankHistory };
  }

  async getConstituencyDetails(
    input: GetEntityDetailsInput,
  ): Promise<ConstituencyLeaderboardDetail> {
    const current = await this.repo.getLatestSnapshotForEntity(
      input.entityId,
      'CONSTITUENCY',
      input.periodType ?? 'MONTHLY',
      false, // constituency metrics always public
    );

    if (!current) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: LEADERBOARD_ERROR.SNAPSHOT_NOT_FOUND,
      });
    }

    const rankHistory = await this.repo.getRankHistory(
      input.entityId,
      'CONSTITUENCY',
      input.periodType ?? 'MONTHLY',
      RANK_HISTORY_PERIODS,
    );

    return { current, rankHistory };
  }

  async getTopPerformers(input: GetTopPerformersInput): Promise<LeaderboardEntry[]> {
    return this.repo.getTopPerformers(
      input.entityType,
      input.periodType ?? 'MONTHLY',
      input.limit ?? 5,
    );
  }

  async getMostImproved(input: GetMostImprovedInput): Promise<MostImprovedEntry[]> {
    const periodType = input.periodType ?? 'MONTHLY';
    const entityType: LeaderboardEntityType = input.entityType;
    const limit = input.limit ?? 5;

    // Get current period leaderboard (full list for comparison)
    const currentResult = await this.repo.getLatestPublishedLeaderboard(
      entityType,
      periodType,
      1,
      1000, // large enough to cover all entities
      false,
    );

    if (currentResult.items.length === 0) return [];

    // Get previous period snapshots as a lookup map
    const previousMap = await this.repo.getPreviousPeriodSnapshots(
      entityType,
      periodType,
      currentResult.periodStart,
    );

    return computeMostImproved(currentResult.items, previousMap, limit);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLeaderboardService(repo: LeaderboardRepository): LeaderboardService {
  return new LeaderboardService(repo);
}

// ---------------------------------------------------------------------------
// Private helper — compute median of a number array
// ---------------------------------------------------------------------------

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
