import { z } from 'zod';
import { latitudeSchema, longitudeSchema, cuidSchema } from './complaints';

// ---------------------------------------------------------------------------
// Reusable geo primitives
// ---------------------------------------------------------------------------

const constituencyTypeSchema = z.enum(['WARD', 'ASSEMBLY', 'PARLIAMENTARY']);

// ---------------------------------------------------------------------------
// findConstituencyByLocation
// Public — used by complaint creation flow to preview assignment.
// ---------------------------------------------------------------------------

export const findConstituencyByLocationSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export type FindConstituencyByLocationSchema = z.infer<typeof findConstituencyByLocationSchema>;

// ---------------------------------------------------------------------------
// getConstituency
// ---------------------------------------------------------------------------

export const getConstituencySchema = z.object({
  id: cuidSchema,
});

export type GetConstituencySchema = z.infer<typeof getConstituencySchema>;

// ---------------------------------------------------------------------------
// listConstituencies
// ---------------------------------------------------------------------------

export const listConstituenciesSchema = z.object({
  type: constituencyTypeSchema.optional(),
  isActive: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListConstituenciesSchema = z.infer<typeof listConstituenciesSchema>;

// ---------------------------------------------------------------------------
// assignComplaintToAuthority  (admin manual override)
// ---------------------------------------------------------------------------

export const assignComplaintToAuthoritySchema = z
  .object({
    complaintId: cuidSchema,
    authorityId: cuidSchema.optional(),
    constituencyId: cuidSchema.optional(),
    remarks: z.string().trim().max(500, 'Remarks must not exceed 500 characters').optional(),
  })
  .superRefine((val, ctx) => {
    // Must provide at least one of authorityId or constituencyId so the
    // service has something to act on; providing neither is a no-op.
    if (!val.authorityId && !val.constituencyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide at least one of authorityId or constituencyId',
        path: ['authorityId'],
      });
    }
  });

export type AssignComplaintToAuthoritySchema = z.infer<typeof assignComplaintToAuthoritySchema>;

// ---------------------------------------------------------------------------
// listAuthorityAssignments  (admin)
// ---------------------------------------------------------------------------

export const listAuthorityAssignmentsSchema = z.object({
  constituencyId: cuidSchema.optional(),
  authorityId: cuidSchema.optional(),
  isActive: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListAuthorityAssignmentsSchema = z.infer<typeof listAuthorityAssignmentsSchema>;
