import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

/** India approximate bounding box — keeps garbage GPS off the map */
const INDIA_BOUNDS = {
  lat: { min: 6.5, max: 37.6 },
  lng: { min: 68.1, max: 97.4 },
} as const;

export const latitudeSchema = z.coerce
  .number()
  .finite()
  .min(INDIA_BOUNDS.lat.min, 'Latitude must be within India')
  .max(INDIA_BOUNDS.lat.max, 'Latitude must be within India');

export const longitudeSchema = z.coerce
  .number()
  .finite()
  .min(INDIA_BOUNDS.lng.min, 'Longitude must be within India')
  .max(INDIA_BOUNDS.lng.max, 'Longitude must be within India');

export const complaintTitleSchema = z
  .string()
  .trim()
  .min(5, 'Title must be at least 5 characters')
  .max(120, 'Title must not exceed 120 characters');

export const complaintDescriptionSchema = z
  .string()
  .trim()
  .min(20, 'Description must be at least 20 characters')
  .max(5000, 'Description must not exceed 5000 characters');

export const cuidSchema = z.string().cuid('Invalid ID format');

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

const MEDIA_TYPE = ['IMAGE', 'VIDEO'] as const;

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export const complaintMediaItemSchema = z
  .object({
    mediaType: z.enum(MEDIA_TYPE, { message: 'Media type must be IMAGE or VIDEO' }),
    mediaUrl: z.string().url('Media URL must be a valid URL').default(''),
    mimeType: z.string().max(100).optional(),
    fileSize: z.number().int().positive().optional(),
    sortOrder: z.number().int().nonnegative().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.fileSize !== undefined) {
      const maxBytes = data.mediaType === 'IMAGE' ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
      if (data.fileSize > maxBytes) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: maxBytes,
          type: 'number',
          inclusive: true,
          message: `${data.mediaType === 'IMAGE' ? 'Image' : 'Video'} must not exceed ${maxBytes / 1024 / 1024} MB`,
          path: ['fileSize'],
        });
      }
    }
  });

export const complaintMediaSchema = z
  .array(complaintMediaItemSchema)
  .min(1, 'At least one media file is required')
  .max(5, 'Maximum 5 media files allowed');

// ---------------------------------------------------------------------------
// createComplaint
// ---------------------------------------------------------------------------

const COMPLAINT_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const createComplaintSchema = z.object({
  title: complaintTitleSchema,
  description: complaintDescriptionSchema,
  categoryId: cuidSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  address: z.string().trim().max(500).optional(),
  priority: z.enum(COMPLAINT_PRIORITY).default('MEDIUM'),
  // Phase 7: media is uploaded separately after complaint creation via
  // media.createUploadRequest / media.confirmUpload. This field is
  // deprecated and ignored by the service layer.
  media: complaintMediaSchema.optional(),
  isPublic: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// getComplaintById / deleteComplaint
// ---------------------------------------------------------------------------

export const complaintIdSchema = z.object({
  id: cuidSchema,
});

// ---------------------------------------------------------------------------
// listComplaints
// ---------------------------------------------------------------------------

const COMPLAINT_STATUS = [
  'SUBMITTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFIED',
  'REJECTED',
] as const;

export const listComplaintsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.enum(COMPLAINT_STATUS).optional(),
  categoryId: cuidSchema.optional(),
  priority: z.enum(COMPLAINT_PRIORITY).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

// ---------------------------------------------------------------------------
// updateComplaintStatus
// ---------------------------------------------------------------------------

export const updateComplaintStatusSchema = z
  .object({
    id: cuidSchema,
    newStatus: z.enum(COMPLAINT_STATUS, { message: 'Invalid status value' }),
    remarks: z.string().trim().min(5).max(1000).optional(),
    assigneeId: cuidSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // remarks mandatory when citizen rejects a resolution
    if (data.newStatus === 'REJECTED' && !data.remarks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Remarks are required when rejecting a complaint',
        path: ['remarks'],
      });
    }
    // assigneeId only valid when transitioning to ASSIGNED
    if (data.assigneeId && data.newStatus !== 'ASSIGNED') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'assigneeId is only allowed when transitioning to ASSIGNED',
        path: ['assigneeId'],
      });
    }
  });

// ---------------------------------------------------------------------------
// Inferred types (consumed by service layer)
// ---------------------------------------------------------------------------

export type CreateComplaintSchema = z.infer<typeof createComplaintSchema>;
export type ComplaintIdSchema = z.infer<typeof complaintIdSchema>;
export type ListComplaintsSchema = z.infer<typeof listComplaintsSchema>;
export type UpdateComplaintStatusSchema = z.infer<typeof updateComplaintStatusSchema>;
export type ComplaintMediaItemSchema = z.infer<typeof complaintMediaItemSchema>;
