import type { PrismaClient } from '@awaaz/db';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Generation metric row shapes
// ---------------------------------------------------------------------------

export interface AuthorityGenerationRow {
  authority_id: string;
  authority_name: string;
  assigned_count: bigint;
  resolved_count: bigint;
  verified_count: bigint;
  rejected_count: bigint;
  open_count: bigint;
  /** Open complaints past their SLA window */
  overdue_count: bigint;
  /** Complaints auto-assigned by geo system */
  auto_assigned_count: bigint;
  /** P50 resolution time in hours — null when no complaints resolved */
  median_resolution_hours: string | null;
}

export interface ConstituencyGenerationRow {
  constituency_id: string;
  constituency_name: string;
  total: bigint;
  resolved_count: bigint;
  verified_count: bigint;
  open_count: bigint;
  auto_assigned_count: bigint;
  total_assigned_count: bigint;
}
import type {
  AuthorityScoreMetrics,
  ConstituencyScoreMetrics,
  LeaderboardEntry,
  LeaderboardEntityType,
  LeaderboardListResult,
  LeaderboardPeriodType,
  RankHistoryPoint,
} from '@awaaz/types';
import { RANK_HISTORY_PERIODS } from './leaderboard.constants.js';

// ---------------------------------------------------------------------------
// Raw DB row shape — mirrors the leaderboard_snapshots table columns
// ---------------------------------------------------------------------------

interface SnapshotRow {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  score: number;
  rank: number;
  metrics: unknown; // JSONB — cast to typed shape in mapper
  scoreVersion: string;
  periodType: string;
  periodStart: Date;
  periodEnd: Date;
  generationBatch: string;
  isPublished: boolean;
  generatedAt: Date;
}

// ---------------------------------------------------------------------------
// Row count query result
// ---------------------------------------------------------------------------

interface CountRow {
  count: bigint;
}

// ---------------------------------------------------------------------------
// Mapper — raw Prisma row → typed LeaderboardEntry
// ---------------------------------------------------------------------------

function toEntry(row: SnapshotRow, includeMetrics: boolean): LeaderboardEntry {
  return {
    id: row.id,
    entityType: row.entityType as LeaderboardEntityType,
    entityId: row.entityId,
    entityName: row.entityName,
    score: row.score,
    rank: row.rank,
    metrics: includeMetrics
      ? (row.metrics as AuthorityScoreMetrics | ConstituencyScoreMetrics)
      : null,
    scoreVersion: row.scoreVersion,
    periodType: row.periodType as LeaderboardPeriodType,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    generatedAt: row.generatedAt,
  };
}

// ---------------------------------------------------------------------------
// Leaderboard Repository
// ---------------------------------------------------------------------------

export class LeaderboardRepository {
  constructor(private readonly db: PrismaClient) {}

  // =========================================================================
  // Write path — snapshot creation + batch publication
  // =========================================================================

  /**
   * Inserts a single snapshot row with isPublished = false.
   * All snapshots in a generation batch start unpublished and are flipped
   * atomically via publishBatch() once the full run is complete.
   */
  async createSnapshot(data: {
    entityType: LeaderboardEntityType;
    entityId: string;
    entityName: string;
    score: number;
    rank: number;
    metrics: AuthorityScoreMetrics | ConstituencyScoreMetrics;
    scoreVersion: string;
    periodType: LeaderboardPeriodType;
    periodStart: Date;
    periodEnd: Date;
    generationBatch: string;
  }): Promise<void> {
    await this.db.leaderboardSnapshot.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        score: data.score,
        rank: data.rank,
        metrics: data.metrics as unknown as Prisma.InputJsonValue,
        scoreVersion: data.scoreVersion,
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        generationBatch: data.generationBatch,
        isPublished: false,
      },
    });
  }

  /**
   * Bulk-inserts all snapshots for one generation batch in a single
   * createMany call. More efficient than individual creates for large
   * leaderboards (e.g. 500 constituencies).
   *
   * Returns the number of rows inserted.
   */
  async createSnapshotsBatch(
    items: Array<{
      entityType: LeaderboardEntityType;
      entityId: string;
      entityName: string;
      score: number;
      rank: number;
      metrics: AuthorityScoreMetrics | ConstituencyScoreMetrics;
      scoreVersion: string;
      periodType: LeaderboardPeriodType;
      periodStart: Date;
      periodEnd: Date;
      generationBatch: string;
    }>,
  ): Promise<number> {
    const result = await this.db.leaderboardSnapshot.createMany({
      data: items.map((d) => ({
        entityType: d.entityType,
        entityId: d.entityId,
        entityName: d.entityName,
        score: d.score,
        rank: d.rank,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metrics: d.metrics as any,
        scoreVersion: d.scoreVersion,
        periodType: d.periodType,
        periodStart: d.periodStart,
        periodEnd: d.periodEnd,
        generationBatch: d.generationBatch,
        isPublished: false,
      })),
    });
    return result.count;
  }

  /**
   * Atomically flips isPublished = true for all snapshots in a batch.
   * Called only after all entities in the batch have been scored — ensures
   * users never see a partially-generated leaderboard.
   */
  async publishBatch(generationBatch: string): Promise<number> {
    const result = await this.db.leaderboardSnapshot.updateMany({
      where: { generationBatch, isPublished: false },
      data: { isPublished: true },
    });
    return result.count;
  }

  /**
   * Marks all snapshots in a batch as permanently unpublished (failed run).
   * Used when generation errors out partway through, preventing partial data
   * from ever becoming visible.
   */
  async cancelBatch(generationBatch: string): Promise<void> {
    await this.db.leaderboardSnapshot.deleteMany({
      where: { generationBatch, isPublished: false },
    });
  }

  // =========================================================================
  // Read path — published leaderboard queries
  // =========================================================================

  /**
   * Returns the latest published leaderboard for a given entity type and
   * period type. "Latest" is determined by the most recent periodStart among
   * published snapshots, ensuring users always see the newest generation.
   */
  async getLatestPublishedLeaderboard(
    entityType: LeaderboardEntityType,
    periodType: LeaderboardPeriodType,
    page: number,
    limit: number,
    includeMetrics: boolean,
  ): Promise<LeaderboardListResult> {
    // Step 1: Find the most recent periodStart for this entity+period combo
    const latest = await this.db.leaderboardSnapshot.findFirst({
      where: { entityType, periodType, isPublished: true },
      orderBy: { periodStart: 'desc' },
      select: { periodStart: true, periodEnd: true, generatedAt: true },
    });

    if (!latest) {
      return {
        items: [],
        total: 0,
        periodType,
        periodStart: new Date(),
        periodEnd: new Date(),
        generatedAt: new Date(),
      };
    }

    const { periodStart, periodEnd, generatedAt } = latest;

    // Step 2: Paginated fetch for that specific period
    const [rows, countRows] = await Promise.all([
      this.db.$queryRaw<SnapshotRow[]>`
        SELECT
          id, "entityType", "entityId", "entityName",
          score, rank,
          ${includeMetrics ? Prisma.sql`metrics` : Prisma.sql`NULL::jsonb AS metrics`},
          "scoreVersion", "periodType", "periodStart", "periodEnd",
          "generationBatch", "isPublished", "generatedAt"
        FROM leaderboard_snapshots
        WHERE "entityType" = ${entityType}
          AND "periodType" = ${periodType}
          AND "periodStart" = ${periodStart}
          AND "isPublished" = true
        ORDER BY rank ASC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `,
      this.db.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS count
        FROM leaderboard_snapshots
        WHERE "entityType" = ${entityType}
          AND "periodType" = ${periodType}
          AND "periodStart" = ${periodStart}
          AND "isPublished" = true
      `,
    ]);

    const total = Number(countRows[0]?.count ?? 0n);

    return {
      items: rows.map((r) => toEntry(r, includeMetrics)),
      total,
      periodType,
      periodStart,
      periodEnd,
      generatedAt,
    };
  }

  /**
   * Returns the latest published snapshot for a single entity.
   * Used by getAuthorityDetails and getConstituencyDetails.
   */
  async getLatestSnapshotForEntity(
    entityId: string,
    entityType: LeaderboardEntityType,
    periodType: LeaderboardPeriodType,
    includeMetrics: boolean,
  ): Promise<LeaderboardEntry | null> {
    const row = await this.db.leaderboardSnapshot.findFirst({
      where: { entityId, entityType, periodType, isPublished: true },
      orderBy: { periodStart: 'desc' },
    });
    if (!row) return null;
    return toEntry(row as unknown as SnapshotRow, includeMetrics);
  }

  /**
   * Returns the last N periods of rank history for a single entity.
   * Used to populate trend charts on the detail pages.
   * Results are ordered oldest → newest for charting.
   */
  async getRankHistory(
    entityId: string,
    entityType: LeaderboardEntityType,
    periodType: LeaderboardPeriodType,
    periods: number = RANK_HISTORY_PERIODS,
  ): Promise<RankHistoryPoint[]> {
    const rows = await this.db.leaderboardSnapshot.findMany({
      where: { entityId, entityType, periodType, isPublished: true },
      orderBy: { periodStart: 'desc' },
      take: periods,
      select: {
        periodType: true,
        periodStart: true,
        score: true,
        rank: true,
      },
    });

    // Reverse so chart renders left (oldest) → right (newest)
    return rows.reverse().map((r) => ({
      periodType: r.periodType as LeaderboardPeriodType,
      periodStart: r.periodStart,
      score: r.score,
      rank: r.rank,
    }));
  }

  /**
   * Returns the top N entities for a given period.
   * Used by the homepage "Top Performers" widget.
   * No pagination — callers should keep limit ≤ 20.
   */
  async getTopPerformers(
    entityType: LeaderboardEntityType,
    periodType: LeaderboardPeriodType,
    limit: number,
  ): Promise<LeaderboardEntry[]> {
    const latest = await this.db.leaderboardSnapshot.findFirst({
      where: { entityType, periodType, isPublished: true },
      orderBy: { periodStart: 'desc' },
      select: { periodStart: true },
    });
    if (!latest) return [];

    const rows = await this.db.leaderboardSnapshot.findMany({
      where: {
        entityType,
        periodType,
        periodStart: latest.periodStart,
        isPublished: true,
      },
      orderBy: { rank: 'asc' },
      take: limit,
    });

    return rows.map((r) => toEntry(r as unknown as SnapshotRow, false));
  }

  /**
   * Returns the snapshot for the immediately preceding period of the same
   * periodType. Used by getMostImproved to compute score deltas.
   *
   * "Previous" = the published snapshot with the largest periodStart that is
   * strictly before the given currentPeriodStart.
   */
  async getPreviousPeriodSnapshots(
    entityType: LeaderboardEntityType,
    periodType: LeaderboardPeriodType,
    currentPeriodStart: Date,
  ): Promise<Map<string, LeaderboardEntry>> {
    const prevLatest = await this.db.leaderboardSnapshot.findFirst({
      where: {
        entityType,
        periodType,
        periodStart: { lt: currentPeriodStart },
        isPublished: true,
      },
      orderBy: { periodStart: 'desc' },
      select: { periodStart: true },
    });
    if (!prevLatest) return new Map();

    const rows = await this.db.leaderboardSnapshot.findMany({
      where: {
        entityType,
        periodType,
        periodStart: prevLatest.periodStart,
        isPublished: true,
      },
    });

    const map = new Map<string, LeaderboardEntry>();
    for (const row of rows) {
      map.set(row.entityId, toEntry(row as unknown as SnapshotRow, false));
    }
    return map;
  }

  // =========================================================================
  // Generation helpers
  // =========================================================================

  /**
   * Checks whether a published snapshot already exists for a given
   * (entityType, periodType, periodStart) combination.
   * Used by the service to avoid double-generating the same period.
   */
  async snapshotExists(
    entityType: LeaderboardEntityType,
    periodType: LeaderboardPeriodType,
    periodStart: Date,
  ): Promise<boolean> {
    const count = await this.db.leaderboardSnapshot.count({
      where: { entityType, periodType, periodStart, isPublished: true },
    });
    return count > 0;
  }

  /**
   * Returns the platform-wide mean score for a given entity type and period.
   * Used as the Bayesian smoothing prior and as the fallback for
   * citizenApprovalRate when an authority has too few engagement actions.
   *
   * Returns 50 (neutral) when no published snapshots exist yet.
   */
  async getPlatformMeanScore(
    entityType: LeaderboardEntityType,
    periodType: LeaderboardPeriodType,
    periodStart: Date,
  ): Promise<number> {
    const result = await this.db.$queryRaw<Array<{ avg: string | null }>>`
      SELECT AVG(score)::numeric(10,2) AS avg
      FROM leaderboard_snapshots
      WHERE "entityType" = ${entityType}
        AND "periodType" = ${periodType}
        AND "periodStart" = ${periodStart}
        AND "isPublished" = true
    `;
    const avg = result[0]?.avg;
    return avg != null ? Number(avg) : 50;
  }

  // =========================================================================
  // Generation data-gathering queries
  //
  // These queries are only called during leaderboard generation (batch job),
  // never on the hot read path. They aggregate all entities in one query
  // rather than N per-entity queries.
  // =========================================================================

  /**
   * Returns all per-authority metrics needed to compute authority scores.
   * One row per MLA user who has at least one complaint assigned in the window.
   *
   * overdueCount uses the MEDIUM SLA (72h) as the default overdue threshold.
   * Future: join complaints.priority → RESOLUTION_SLA_HOURS[priority] for
   * per-priority SLA enforcement.
   */
  async getAuthorityMetricsForGeneration(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AuthorityGenerationRow[]> {
    return this.db.$queryRaw<AuthorityGenerationRow[]>`
      SELECT
        u.id                                                              AS authority_id,
        COALESCE(u.name, u."phoneNumber")                                AS authority_name,
        COUNT(c.id)                                                       AS assigned_count,
        COUNT(c.id) FILTER (WHERE c.status IN (
          'RESOLVED'::"ComplaintStatus",
          'VERIFIED'::"ComplaintStatus"
        ))                                                                AS resolved_count,
        COUNT(c.id) FILTER (WHERE c.status = 'VERIFIED'::"ComplaintStatus")
                                                                          AS verified_count,
        COUNT(c.id) FILTER (WHERE c.status = 'REJECTED'::"ComplaintStatus")
                                                                          AS rejected_count,
        COUNT(c.id) FILTER (WHERE c.status IN (
          'SUBMITTED'::"ComplaintStatus",
          'ASSIGNED'::"ComplaintStatus",
          'IN_PROGRESS'::"ComplaintStatus"
        ))                                                                AS open_count,
        -- Overdue: open complaints past the 72-hour MEDIUM SLA
        COUNT(c.id) FILTER (WHERE c.status IN (
            'SUBMITTED'::"ComplaintStatus",
            'ASSIGNED'::"ComplaintStatus",
            'IN_PROGRESS'::"ComplaintStatus"
          ) AND c."createdAt" < NOW() - INTERVAL '72 hours'
        )                                                                 AS overdue_count,
        COUNT(c.id) FILTER (
          WHERE c."assignmentSource" = 'AUTO'::"AssignmentSource"
        )                                                                 AS auto_assigned_count,
        -- Median resolution time per authority
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (r.resolved_at - c."createdAt")) / 3600.0
        )::numeric(10,2)                                                  AS median_resolution_hours
      FROM users u
      JOIN complaints c
        ON c."assignedAuthorityId" = u.id
        AND c."deletedAt" IS NULL
        AND c."createdAt" >= ${dateFrom}
        AND c."createdAt" <= ${dateTo}
      LEFT JOIN LATERAL (
        SELECT MIN("createdAt") AS resolved_at
        FROM complaint_status_history
        WHERE "complaintId" = c.id
          AND "newStatus" = 'RESOLVED'::"ComplaintStatus"
      ) r ON TRUE
      WHERE u.role = 'MLA'::"UserRole"
      GROUP BY u.id, u.name, u."phoneNumber"
      HAVING COUNT(c.id) > 0
    `;
  }

  /**
   * Returns all per-constituency metrics needed to compute constituency scores.
   * One row per active constituency — including those with 0 complaints (via
   * LEFT JOIN) so every constituency appears in the leaderboard.
   */
  async getConstituencyMetricsForGeneration(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<ConstituencyGenerationRow[]> {
    return this.db.$queryRaw<ConstituencyGenerationRow[]>`
      SELECT
        con.id                                                            AS constituency_id,
        con.name                                                          AS constituency_name,
        COUNT(c.id)                                                       AS total,
        COUNT(c.id) FILTER (WHERE c.status IN (
          'RESOLVED'::"ComplaintStatus",
          'VERIFIED'::"ComplaintStatus"
        ))                                                                AS resolved_count,
        COUNT(c.id) FILTER (WHERE c.status = 'VERIFIED'::"ComplaintStatus")
                                                                          AS verified_count,
        COUNT(c.id) FILTER (WHERE c.status IN (
          'SUBMITTED'::"ComplaintStatus",
          'ASSIGNED'::"ComplaintStatus",
          'IN_PROGRESS'::"ComplaintStatus"
        ))                                                                AS open_count,
        COUNT(c.id) FILTER (
          WHERE c."assignmentSource" = 'AUTO'::"AssignmentSource"
        )                                                                 AS auto_assigned_count,
        COUNT(c.id) FILTER (
          WHERE c."assignedAuthorityId" IS NOT NULL
        )                                                                 AS total_assigned_count
      FROM constituencies con
      LEFT JOIN complaints c
        ON c."constituencyId" = con.id
        AND c."deletedAt" IS NULL
        AND c."createdAt" >= ${dateFrom}
        AND c."createdAt" <= ${dateTo}
      WHERE con."isActive" = true
      GROUP BY con.id, con.name
    `;
  }
}
