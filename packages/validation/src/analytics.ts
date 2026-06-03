import { z } from 'zod';
import { cuidSchema } from './complaints';

// ---------------------------------------------------------------------------
// Shared date range schema
//
// Default window: last 30 days.
// Both bounds are optional — callers can pass one, both, or neither.
// Coerced to Date inside the service, kept as strings here to remain
// serialisation-agnostic across tRPC transports.
// ---------------------------------------------------------------------------

// Base object — kept as ZodObject so it supports .extend() in derived schemas
const dateRangeBaseSchema = z.object({
  /**
   * ISO 8601 datetime string — inclusive lower bound.
   * Defaults to 30 days before dateTo when not provided.
   */
  dateFrom: z
    .string()
    .datetime({ message: 'dateFrom must be a valid ISO 8601 datetime' })
    .optional(),
  /**
   * ISO 8601 datetime string — inclusive upper bound.
   * Defaults to the current moment when not provided.
   */
  dateTo: z.string().datetime({ message: 'dateTo must be a valid ISO 8601 datetime' }).optional(),
  /**
   * Time-series granularity for breakdown charts.
   * Only meaningful for procedures that return a timeSeries array.
   */
  granularity: z.enum(['day', 'week', 'month']).optional(),
});

const validateDateRange = (data: { dateFrom?: string; dateTo?: string }): boolean => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo);
  }
  return true;
};

const dateRangeError = {
  message: 'dateFrom must be before or equal to dateTo',
  path: ['dateFrom'],
};

export const dateRangeSchema = dateRangeBaseSchema.refine(validateDateRange, dateRangeError);

export type DateRangeSchema = z.infer<typeof dateRangeSchema>;

// ---------------------------------------------------------------------------
// analytics.getOverview
// ---------------------------------------------------------------------------

export const getOverviewSchema = dateRangeSchema;
export type GetOverviewSchema = z.infer<typeof getOverviewSchema>;

// ---------------------------------------------------------------------------
// analytics.getComplaintMetrics
// ---------------------------------------------------------------------------

export const getComplaintMetricsSchema = dateRangeSchema;
export type GetComplaintMetricsSchema = z.infer<typeof getComplaintMetricsSchema>;

// ---------------------------------------------------------------------------
// analytics.getCategoryMetrics
// ---------------------------------------------------------------------------

export const getCategoryMetricsSchema = dateRangeSchema;
export type GetCategoryMetricsSchema = z.infer<typeof getCategoryMetricsSchema>;

// ---------------------------------------------------------------------------
// analytics.getConstituencyMetrics
// ---------------------------------------------------------------------------

export const getConstituencyMetricsSchema = dateRangeBaseSchema
  .extend({
    /**
     * Filter to a single constituency.
     * - Admin: optional — omit for platform-wide breakdown.
     * - MLA:   the service overrides this with the caller's constituency ID.
     */
    constituencyId: cuidSchema.optional(),
  })
  .refine(validateDateRange, dateRangeError);
export type GetConstituencyMetricsSchema = z.infer<typeof getConstituencyMetricsSchema>;

// ---------------------------------------------------------------------------
// analytics.getAuthorityMetrics
// ---------------------------------------------------------------------------

export const getAuthorityMetricsSchema = dateRangeBaseSchema
  .extend({
    /**
     * Filter to a single authority.
     * - Admin: optional — omit for full leaderboard.
     * - MLA:   the service overrides this with the caller's own user ID.
     */
    authorityId: cuidSchema.optional(),
  })
  .refine(validateDateRange, dateRangeError);
export type GetAuthorityMetricsSchema = z.infer<typeof getAuthorityMetricsSchema>;

// ---------------------------------------------------------------------------
// analytics.getGovernanceMetrics  (admin only — no extra inputs)
// ---------------------------------------------------------------------------

export const getGovernanceMetricsSchema = dateRangeSchema;
export type GetGovernanceMetricsSchema = z.infer<typeof getGovernanceMetricsSchema>;
