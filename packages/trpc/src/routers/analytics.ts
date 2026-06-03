import type { z } from 'zod';
import type { AnalyticsService } from '@awaaz/analytics';
import {
  getOverviewSchema,
  getComplaintMetricsSchema,
  getCategoryMetricsSchema,
  getConstituencyMetricsSchema,
  getAuthorityMetricsSchema,
  getGovernanceMetricsSchema,
} from '@awaaz/validation';
import { protectedProcedure, router } from '../server';

// Re-export for convenience — eliminates the need for callers to import
// the schema directly when extending it in tests.
export { getOverviewSchema };

export function createAnalyticsRouter(analyticsService: AnalyticsService) {
  return router({
    /**
     * Headline KPIs — totals, open, resolved, verified, closure rate.
     *
     * All roles:
     *   CITIZEN  → own complaints only
     *   MLA      → platform-wide (constituency scoping applied in service)
     *   ADMIN    → full platform
     *
     * Powers: summary cards on all three dashboards.
     */
    getOverview: protectedProcedure.input(getOverviewSchema).query(({ ctx, input }) => {
      return analyticsService.getOverview(ctx.user, input);
    }),

    /**
     * Full status breakdown (7 statuses) plus time KPIs:
     * avgResolutionTime, medianResolutionTime, P90, avgAssignmentTime,
     * avgVerificationTime.
     *
     * All roles (scoped per role — see getOverview).
     * Powers: complaint metrics panel and time-KPI cards.
     */
    getComplaintMetrics: protectedProcedure
      .input(getComplaintMetricsSchema)
      .query(({ ctx, input }) => {
        return analyticsService.getComplaintMetrics(ctx.user, input);
      }),

    /**
     * Complaint distribution by category with percentages.
     * Ordered by complaint count descending (trending categories first).
     *
     * All roles (scoped per role — see getOverview).
     * Powers: category breakdown chart and "trending issues" widget.
     */
    getCategoryMetrics: protectedProcedure
      .input(getCategoryMetricsSchema)
      .query(({ ctx, input }) => {
        return analyticsService.getCategoryMetrics(ctx.user, input);
      }),

    /**
     * Constituency-level breakdown — total, open, resolved, verified,
     * resolution rate per constituency.
     *
     * MLA + ADMIN only (CITIZEN → FORBIDDEN).
     * MLA sees only their active constituency regardless of input.
     * ADMIN sees all constituencies, or filtered by constituencyId.
     *
     * Powers: constituency map overlay and admin area-comparison table.
     */
    getConstituencyMetrics: protectedProcedure
      .input(getConstituencyMetricsSchema)
      .query(({ ctx, input }) => {
        return analyticsService.getConstituencyMetrics(ctx.user, input);
      }),

    /**
     * Authority performance leaderboard — assigned, resolved, verified,
     * rejected, open count, resolution %, citizen approval rate,
     * avg resolution time per MLA/authority.
     *
     * MLA + ADMIN only (CITIZEN → FORBIDDEN).
     * MLA sees only their own row (self-performance dashboard).
     * ADMIN sees all authorities, or filtered by authorityId.
     *
     * Powers: authority leaderboard, MLA self-dashboard, governance scorecard.
     */
    getAuthorityMetrics: protectedProcedure
      .input(getAuthorityMetricsSchema)
      .query(({ ctx, input }) => {
        return analyticsService.getAuthorityMetrics(ctx.user, input);
      }),

    /**
     * Platform-level governance KPIs:
     * verifiedResolutionRate, medianResolutionTime, P90, assignmentEfficiency,
     * unmatchedComplaintRate, citizenEngagementRate, avgComplaintsPerDay.
     *
     * ADMIN only (MLA + CITIZEN → FORBIDDEN).
     * Powers: admin governance scorecard and public transparency dashboard.
     */
    getGovernanceMetrics: protectedProcedure
      .input(getGovernanceMetricsSchema)
      .query(({ ctx, input }) => {
        return analyticsService.getGovernanceMetrics(ctx.user, input);
      }),

    /**
     * Convenience no-input variant of getOverview for the current month.
     * Returns the overview for a fixed 30-day window ending now.
     * Useful for dashboard widgets that always show "last 30 days" without
     * the caller needing to compute dateFrom/dateTo.
     */
    getMonthlySnapshot: protectedProcedure.query(({ ctx }) => {
      return analyticsService.getOverview(ctx.user, {});
    }),
  });
}

// Inferred input type helpers for frontend type safety
export type GetOverviewInput = z.infer<typeof getOverviewSchema>;
export type GetComplaintMetricsInput = z.infer<typeof getComplaintMetricsSchema>;
export type GetCategoryMetricsInput = z.infer<typeof getCategoryMetricsSchema>;
export type GetConstituencyMetricsInput = z.infer<typeof getConstituencyMetricsSchema>;
export type GetAuthorityMetricsInput = z.infer<typeof getAuthorityMetricsSchema>;
export type GetGovernanceMetricsInput = z.infer<typeof getGovernanceMetricsSchema>;
