import { z } from 'zod';

/**
 * Shared Zod schemas and validation helpers.
 * Feature-specific schemas (complaints, auth, etc.) will live here as modules grow.
 */

/** Reusable pagination query schema */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/** UUID param schema for resource routes */
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;

export {
  phoneNumberSchema,
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  logoutSchema,
  type SendOtpInput,
  type VerifyOtpInput,
  type RefreshTokenInput,
  type LogoutInput,
} from './auth';

export {
  getNotificationsSchema,
  markAsReadSchema,
  markAllAsReadSchema,
  type GetNotificationsSchema,
  type MarkAsReadSchema,
  type MarkAllAsReadSchema,
} from './notifications';

export {
  periodTypeSchema,
  entityTypeSchema,
  getLeaderboardSchema,
  getEntityDetailsSchema,
  getTopPerformersSchema,
  getMostImprovedSchema,
  triggerGenerationSchema,
  type PeriodTypeSchema,
  type EntityTypeSchema,
  type GetLeaderboardSchema,
  type GetEntityDetailsSchema,
  type GetTopPerformersSchema,
  type GetMostImprovedSchema,
  type TriggerGenerationSchema,
} from './leaderboard';

export {
  dateRangeSchema,
  getOverviewSchema,
  getComplaintMetricsSchema,
  getCategoryMetricsSchema,
  getConstituencyMetricsSchema,
  getAuthorityMetricsSchema,
  getGovernanceMetricsSchema,
  type DateRangeSchema,
  type GetOverviewSchema,
  type GetComplaintMetricsSchema,
  type GetCategoryMetricsSchema,
  type GetConstituencyMetricsSchema,
  type GetAuthorityMetricsSchema,
  type GetGovernanceMetricsSchema,
} from './analytics';

export {
  findConstituencyByLocationSchema,
  getConstituencySchema,
  listConstituenciesSchema,
  assignComplaintToAuthoritySchema,
  listAuthorityAssignmentsSchema,
  type FindConstituencyByLocationSchema,
  type GetConstituencySchema,
  type ListConstituenciesSchema,
  type AssignComplaintToAuthoritySchema,
  type ListAuthorityAssignmentsSchema,
} from './geo';

export {
  latitudeSchema,
  longitudeSchema,
  complaintTitleSchema,
  complaintDescriptionSchema,
  cuidSchema,
  complaintMediaItemSchema,
  complaintMediaSchema,
  createComplaintSchema,
  complaintIdSchema,
  listComplaintsSchema,
  updateComplaintStatusSchema,
  type CreateComplaintSchema,
  type ComplaintIdSchema,
  type ListComplaintsSchema,
  type UpdateComplaintStatusSchema,
  type ComplaintMediaItemSchema,
} from './complaints';

// ---------------------------------------------------------------------------
// Admin — User Management
// ---------------------------------------------------------------------------
export {
  listUsersSchema,
  adminUserIdSchema,
  updateUserRoleSchema,
  setUserActiveSchema,
  type ListUsersInput,
  type AdminUserIdInput,
  type UpdateUserRoleInput,
  type SetUserActiveInput,
} from './users';

// ---------------------------------------------------------------------------
// Phase 7 — Media Upload & Evidence Management
// ---------------------------------------------------------------------------
export {
  sha256HexSchema,
  createUploadRequestSchema,
  confirmUploadSchema,
  getMediaByComplaintSchema,
  deleteMediaSchema,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  ALL_ALLOWED_MIMES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  type Sha256Hex,
  type CreateUploadRequestSchema,
  type ConfirmUploadSchema,
  type GetMediaByComplaintSchema,
  type DeleteMediaSchema,
} from './media';
