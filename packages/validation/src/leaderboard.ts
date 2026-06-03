import { z } from 'zod';
import { cuidSchema } from './complaints';

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

export const periodTypeSchema = z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ALL_TIME']);
export type PeriodTypeSchema = z.infer<typeof periodTypeSchema>;

export const entityTypeSchema = z.enum(['AUTHORITY', 'CONSTITUENCY']);
export type EntityTypeSchema = z.infer<typeof entityTypeSchema>;

// ---------------------------------------------------------------------------
// leaderboard.getAuthorities
// leaderboard.getConstituencies
//
// Identical structure — entity type is implied by the procedure name.
// ---------------------------------------------------------------------------

export const getLeaderboardSchema = z.object({
  /** Defaults to MONTHLY when not provided */
  periodType: periodTypeSchema.default('MONTHLY'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type GetLeaderboardSchema = z.infer<typeof getLeaderboardSchema>;

// ---------------------------------------------------------------------------
// leaderboard.getAuthorityDetails
// leaderboard.getConstituencyDetails
// ---------------------------------------------------------------------------

export const getEntityDetailsSchema = z.object({
  entityId: cuidSchema,
  /** Defaults to MONTHLY — controls which period's rank history is fetched */
  periodType: periodTypeSchema.default('MONTHLY'),
});
export type GetEntityDetailsSchema = z.infer<typeof getEntityDetailsSchema>;

// ---------------------------------------------------------------------------
// leaderboard.getTopPerformers
// ---------------------------------------------------------------------------

export const getTopPerformersSchema = z.object({
  entityType: entityTypeSchema,
  periodType: periodTypeSchema.default('MONTHLY'),
  /** Max entities to return — used for homepage widget (default 5) */
  limit: z.coerce.number().int().positive().max(20).default(5),
});
export type GetTopPerformersSchema = z.infer<typeof getTopPerformersSchema>;

// ---------------------------------------------------------------------------
// leaderboard.getMostImproved
// ---------------------------------------------------------------------------

export const getMostImprovedSchema = z.object({
  entityType: entityTypeSchema,
  periodType: periodTypeSchema.default('MONTHLY'),
  /** Only WEEKLY and MONTHLY make practical sense for "most improved" */
  limit: z.coerce.number().int().positive().max(20).default(5),
});
export type GetMostImprovedSchema = z.infer<typeof getMostImprovedSchema>;

// ---------------------------------------------------------------------------
// leaderboard.triggerGeneration  (admin only)
// ---------------------------------------------------------------------------

export const triggerGenerationSchema = z.object({
  periodType: periodTypeSchema,
});
export type TriggerGenerationSchema = z.infer<typeof triggerGenerationSchema>;
