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
