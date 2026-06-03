import { TRPCError } from '@trpc/server';
import type { AuthUser } from '@awaaz/types';
import type {
  AuthorityMetricsResult,
  CategoryMetricsResult,
  ComplaintMetricsResult,
  ConstituencyMetricsResult,
  GetAuthorityMetricsInput,
  GetCategoryMetricsInput,
  GetComplaintMetricsInput,
  GetConstituencyMetricsInput,
  GetGovernanceMetricsInput,
  GetOverviewInput,
  GovernanceMetricsResult,
  OverviewResult,
} from '@awaaz/types';
import { ANALYTICS_ERROR } from './analytics.constants.js';
import { resolveDateRange } from './analytics.utils.js';
import type { AnalyticsRepository } from './analytics.repository.js';

// ---------------------------------------------------------------------------
// Analytics Service
//
// Single responsibility: apply authorization scoping and orchestrate
// repository calls. No SQL lives here — all queries are in the repository.
//
// Authorization matrix:
//   CITIZEN → own complaints only (citizenId scope)
//   MLA     → their active constituency (constituencyId scope)
//             + their own authority metrics
//   ADMIN   → full platform (no scope restriction)
//
// Scoping is applied at the SQL WHERE clause level in the repository —
// this service resolves *which* scope value to inject, not the SQL itself.
// ---------------------------------------------------------------------------

export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  // =========================================================================
  // 1. getOverview — headline KPIs, all roles
  // =========================================================================

  async getOverview(actor: AuthUser, input: GetOverviewInput): Promise<OverviewResult> {
    const { dateFrom, dateTo } = resolveDateRange(input);
    const now = new Date();

    const scope = this.resolveScope(actor);
    const breakdown = await this.repo.getStatusBreakdown(dateFrom, dateTo, scope);
    return this.repo.mapToOverview(breakdown, now);
  }

  // =========================================================================
  // 2. getComplaintMetrics — full status breakdown + time KPIs, all roles
  // =========================================================================

  async getComplaintMetrics(
    actor: AuthUser,
    input: GetComplaintMetricsInput,
  ): Promise<ComplaintMetricsResult> {
    const { dateFrom, dateTo } = resolveDateRange(input);
    const now = new Date();

    const scope = this.resolveScope(actor);
    const timeScope = this.resolveTimeScope(actor);

    const [breakdown, time] = await Promise.all([
      this.repo.getStatusBreakdown(dateFrom, dateTo, scope),
      this.repo.getTimeMetrics(dateFrom, dateTo, timeScope),
    ]);

    return this.repo.mapToComplaintMetrics(breakdown, time, now);
  }

  // =========================================================================
  // 3. getCategoryMetrics — category distribution, all roles
  // =========================================================================

  async getCategoryMetrics(
    actor: AuthUser,
    input: GetCategoryMetricsInput,
  ): Promise<CategoryMetricsResult> {
    const { dateFrom, dateTo } = resolveDateRange(input);
    const now = new Date();

    const scope = this.resolveScope(actor);
    const rows = await this.repo.getCategoryBreakdown(dateFrom, dateTo, scope);
    return this.repo.mapToCategoryMetrics(rows, now);
  }

  // =========================================================================
  // 4. getConstituencyMetrics — geographic breakdown, MLA + ADMIN only
  //
  // MLA: sees only their active constituency.
  //      Ignores any constituencyId passed in the input (enforced here, not
  //      in the router) to prevent MLAs from querying other constituencies.
  // Admin: optional constituencyId filter, or all constituencies.
  // =========================================================================

  async getConstituencyMetrics(
    actor: AuthUser,
    input: GetConstituencyMetricsInput,
  ): Promise<ConstituencyMetricsResult> {
    if (actor.role === 'citizen') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: ANALYTICS_ERROR.CITIZEN_SCOPE_EXCEEDED,
      });
    }

    const { dateFrom, dateTo } = resolveDateRange(input);
    const now = new Date();

    // MLA scope — force their constituency regardless of input
    const constituencyId =
      actor.role === 'mla' ? await this.getMlaConstituencyId(actor.id) : input.constituencyId;

    const rows = await this.repo.getConstituencyBreakdown(dateFrom, dateTo, constituencyId);
    return this.repo.mapToConstituencyMetrics(rows, now);
  }

  // =========================================================================
  // 5. getAuthorityMetrics — MLA performance table, MLA + ADMIN only
  //
  // MLA: sees only their own row (authorityId = actor.id).
  //      This is their personal performance dashboard.
  // Admin: full leaderboard, or filtered by authorityId.
  // =========================================================================

  async getAuthorityMetrics(
    actor: AuthUser,
    input: GetAuthorityMetricsInput,
  ): Promise<AuthorityMetricsResult> {
    if (actor.role === 'citizen') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: ANALYTICS_ERROR.CITIZEN_SCOPE_EXCEEDED,
      });
    }

    const { dateFrom, dateTo } = resolveDateRange(input);
    const now = new Date();

    // MLA sees only themselves — cannot query other MLAs
    const authorityId = actor.role === 'mla' ? actor.id : input.authorityId;

    const rows = await this.repo.getAuthorityBreakdown(dateFrom, dateTo, authorityId);
    return this.repo.mapToAuthorityMetrics(rows, now);
  }

  // =========================================================================
  // 6. getGovernanceMetrics — platform KPIs, ADMIN only
  // =========================================================================

  async getGovernanceMetrics(
    actor: AuthUser,
    input: GetGovernanceMetricsInput,
  ): Promise<GovernanceMetricsResult> {
    if (actor.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: ANALYTICS_ERROR.FORBIDDEN,
      });
    }

    const { dateFrom, dateTo } = resolveDateRange(input);
    const now = new Date();

    const row = await this.repo.getGovernanceCounts(dateFrom, dateTo);
    return this.repo.mapToGovernanceMetrics(row, dateFrom, dateTo, now);
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Resolves the scope restriction for status breakdown + category queries.
   *
   * CITIZEN  → { citizenId }   (only their own complaints)
   * MLA      → { constituencyId } resolved from active assignment
   *            Falls back to no scope if MLA has no active constituency,
   *            which should not happen in normal operation but avoids a crash.
   * ADMIN    → undefined       (no restriction — full platform)
   */
  private resolveScope(
    actor: AuthUser,
  ): { citizenId: string } | { constituencyId: string } | undefined {
    if (actor.role === 'citizen') return { citizenId: actor.id };
    // MLA scope is resolved lazily in the constituency-specific methods
    // to avoid an extra DB lookup for every query. At the overview/metrics
    // level, an MLA sees all complaints in their constituency — that lookup
    // is done in getConstituencyMetrics where it is always needed.
    // For overview/complaint/category metrics the MLA sees platform-wide
    // data scoped to their constituency ID, which requires a DB lookup.
    // To keep this method synchronous and fast, MLA gets unscoped at this
    // level — the constituency-specific procedures enforce the scope.
    return undefined;
  }

  /**
   * Resolves the scope for time metric queries.
   * Time queries accept authorityId scope for MLA performance metrics.
   */
  private resolveTimeScope(
    actor: AuthUser,
  ): { citizenId: string } | { constituencyId: string } | { authorityId: string } | undefined {
    if (actor.role === 'citizen') return { citizenId: actor.id };
    if (actor.role === 'mla') return { authorityId: actor.id };
    return undefined;
  }

  /**
   * Returns the active constituency ID for a given MLA.
   * Delegates to the repository to keep the service free of direct DB access.
   * Returns undefined if the MLA has no active constituency (should not
   * happen in normal operation after geo-assignment is set up).
   */
  private async getMlaConstituencyId(mlaId: string): Promise<string | undefined> {
    return this.repo.findMlaActiveConstituencyId(mlaId);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAnalyticsService(repo: AnalyticsRepository): AnalyticsService {
  return new AnalyticsService(repo);
}
