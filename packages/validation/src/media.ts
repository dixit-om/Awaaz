/**
 * Phase 7 — Media Upload & Evidence Management
 * Zod schemas for all media tRPC procedures.
 *
 * Security layers enforced here (server-side, before any cloud call):
 *   1. MIME type whitelist  — blocks unsupported / dangerous formats
 *   2. File size limits     — per type (image 10 MB / video 100 MB)
 *   3. SHA-256 format check — 64 lowercase hex chars, no injection surface
 *   4. HTTPS URL enforcement— delivery URLs must use TLS
 *   5. publicId integrity   — non-empty, bounded length, no path traversal chars
 *
 * Note: these constraints are ALSO enforced at the cloud provider level via
 * upload presets (Cloudinary) / bucket policies (S3) as defence-in-depth.
 * Neither layer alone is sufficient.
 */
import { z } from 'zod';
import { cuidSchema } from './complaints';

// ---------------------------------------------------------------------------
// Shared constants (mirrored in media.constants.ts — kept here to avoid
// introducing a dependency from @awaaz/validation on @awaaz/media)
// ---------------------------------------------------------------------------

/** Maximum image upload size: 10 MB */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Maximum video upload size: 100 MB */
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/**
 * Allowed MIME types.
 *
 * Images: JPEG, PNG, WebP, HEIC/HEIF (modern mobile cameras).
 * Excluded: SVG (XSS attack vector), GIF (NSFW abuse), raw sensor formats.
 *
 * Videos: MP4 (H.264/H.265 — universal), QuickTime MOV (iOS), WebM (Android),
 *         3GPP (budget Android devices common in India).
 * Excluded: AVI, WMV (legacy desktop formats with no civic use case).
 */
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'] as const;

const ALL_ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES] as const;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/**
 * SHA-256 hex digest: exactly 64 lowercase hexadecimal characters.
 * Rejects uppercase, padding, whitespace, and any injection payloads.
 */
export const sha256HexSchema = z
  .string()
  .length(64, 'SHA-256 hash must be exactly 64 hex characters')
  .regex(/^[0-9a-f]{64}$/, 'SHA-256 hash must contain only lowercase hex characters (0-9, a-f)');

export type Sha256Hex = z.infer<typeof sha256HexSchema>;

/**
 * HTTPS-only URL.
 * Evidence delivery URLs must always be served over TLS.
 */
const httpsUrlSchema = z
  .string()
  .url('Must be a valid URL')
  .refine((url) => url.startsWith('https://'), {
    message: 'URL must use HTTPS',
  });

/**
 * Cloud provider public_id / asset key.
 * Allows Cloudinary-style paths like "awaaz/complaints/abc123/xyz456"
 * but rejects path traversal sequences (..) and null bytes.
 */
const publicIdSchema = z
  .string()
  .min(1, 'publicId must not be empty')
  .max(500, 'publicId must not exceed 500 characters')
  .refine((id) => !id.includes('..') && !id.includes('\0'), {
    message: 'publicId contains invalid characters',
  });

// ---------------------------------------------------------------------------
// media.createUploadRequest
// ---------------------------------------------------------------------------

/**
 * Input validated before the server generates signed upload credentials.
 *
 * Security checks performed:
 *   - complaintId must be a valid CUID (ownership verified in service layer)
 *   - mimeType must be in the server-side whitelist
 *   - sizeBytes must not exceed the per-type limit
 *   - sha256HashEarly allows early duplicate detection before signing
 *
 * The MIME type is client-declared here; the cloud upload preset enforces
 * the same whitelist at provider level as a second layer.
 */
export const createUploadRequestSchema = z
  .object({
    complaintId: cuidSchema,
    mediaType: z.enum(['IMAGE', 'VIDEO'], {
      errorMap: () => ({ message: 'mediaType must be IMAGE or VIDEO' }),
    }),
    /**
     * Original device filename — stored for display only, never used for routing.
     * Max 255 chars covers all common filesystem limits.
     */
    fileName: z
      .string()
      .trim()
      .min(1, 'fileName is required')
      .max(255, 'fileName must not exceed 255 characters'),
    /**
     * Client-declared MIME type. Validated against the server whitelist.
     * Must match the mediaType field (e.g. image/* for IMAGE, video/* for VIDEO).
     */
    mimeType: z.enum(ALL_ALLOWED_MIMES, {
      errorMap: () => ({
        message: `mimeType must be one of: ${ALL_ALLOWED_MIMES.join(', ')}`,
      }),
    }),
    /**
     * Declared file size in bytes. Validated against the per-type size limit.
     * The actual byte count is re-checked by the cloud upload preset.
     */
    sizeBytes: z
      .number()
      .int('sizeBytes must be an integer')
      .positive('sizeBytes must be positive'),
    /**
     * Optional: SHA-256 digest pre-computed by the client before uploading.
     * If supplied, the server checks for duplicate assets (same hash on the
     * same complaint) before issuing signed credentials — prevents redundant uploads.
     * If omitted here, it MUST be supplied in confirmUpload.
     */
    sha256HashEarly: sha256HexSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // Cross-field: mimeType must belong to the declared mediaType family
    const isImageMime = (ALLOWED_IMAGE_MIMES as readonly string[]).includes(data.mimeType);
    const isVideoMime = (ALLOWED_VIDEO_MIMES as readonly string[]).includes(data.mimeType);

    if (data.mediaType === 'IMAGE' && !isImageMime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mimeType'],
        message: `mimeType "${data.mimeType}" is not a valid image MIME type`,
      });
    }
    if (data.mediaType === 'VIDEO' && !isVideoMime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mimeType'],
        message: `mimeType "${data.mimeType}" is not a valid video MIME type`,
      });
    }

    // Cross-field: sizeBytes must not exceed the per-type limit
    const maxBytes = data.mediaType === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (data.sizeBytes > maxBytes) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: maxBytes,
        type: 'number',
        inclusive: true,
        path: ['sizeBytes'],
        message: `${data.mediaType === 'IMAGE' ? 'Image' : 'Video'} must not exceed ${maxBytes / 1024 / 1024} MB`,
      });
    }
  });

export type CreateUploadRequestSchema = z.infer<typeof createUploadRequestSchema>;

// ---------------------------------------------------------------------------
// media.confirmUpload
// ---------------------------------------------------------------------------

/**
 * Input sent by the client after the direct upload to the cloud provider succeeds.
 *
 * Security checks performed:
 *   - mediaAssetId must match a MediaAsset created by THIS user (service layer)
 *   - publicId must match the server-issued pendingUploadToken (service layer)
 *   - secureUrl must be HTTPS (prevents downgrade to plain HTTP)
 *   - sha256Hash format validated — value stored immutably for evidence integrity
 *   - capturedAt cannot be in the future (future backdating guard)
 *   - metadata dimensions are non-negative integers (provider data sanity check)
 */
export const confirmUploadSchema = z
  .object({
    mediaAssetId: cuidSchema,
    /** Must exactly match the publicId issued by createUploadRequest. */
    publicId: publicIdSchema,
    /** HTTPS delivery URL returned by the cloud provider upload response. */
    secureUrl: httpsUrlSchema,
    /**
     * SHA-256 hex digest of the uploaded bytes.
     * Required if not supplied in createUploadRequest.
     * Stored immutably — used for tamper detection and duplicate identification.
     */
    sha256Hash: sha256HexSchema.optional(),
    /**
     * EXIF capture timestamp extracted from the file metadata by the client.
     * Omitted when the device/OS strips EXIF (common on privacy-focused apps).
     * Coerced from ISO-8601 string or Unix ms timestamp.
     */
    capturedAt: z.coerce.date().optional(),
    /**
     * Technical metadata returned by the cloud provider upload response.
     * Dimensions / duration come from the provider, not the client — the provider
     * has already decoded the file at this point and its values are authoritative.
     */
    metadata: z.object({
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      /** Video duration in whole seconds. */
      durationSec: z.number().int().nonnegative().optional(),
      /** Thumbnail URL from eager transform (Cloudinary) or post-processing. */
      thumbnailUrl: httpsUrlSchema.optional(),
      /**
       * Actual bytes confirmed by the provider.
       * May differ slightly from the declared sizeBytes due to re-encoding.
       */
      sizeBytes: z.number().int().positive().optional(),
    }),
  })
  .superRefine((data, ctx) => {
    // capturedAt must not be in the future (max 1 hour clock skew allowed)
    if (data.capturedAt) {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      if (data.capturedAt > oneHourFromNow) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['capturedAt'],
          message: 'capturedAt cannot be in the future',
        });
      }
    }
  });

export type ConfirmUploadSchema = z.infer<typeof confirmUploadSchema>;

// ---------------------------------------------------------------------------
// media.getMediaByComplaint
// ---------------------------------------------------------------------------

/**
 * Input for fetching all media assets attached to a complaint.
 * Authorization is performed in the service layer:
 *   CITIZEN → own complaints only
 *   MLA     → complaints in their constituency
 *   ADMIN   → any complaint
 */
export const getMediaByComplaintSchema = z.object({
  complaintId: cuidSchema,
});

export type GetMediaByComplaintSchema = z.infer<typeof getMediaByComplaintSchema>;

// ---------------------------------------------------------------------------
// media.deleteMedia
// ---------------------------------------------------------------------------

/**
 * Input for soft-deleting a media asset.
 * Authorization is performed in the service layer:
 *   CITIZEN → own uploads in UPLOADING or READY status only
 *   ADMIN   → any asset in any status
 *
 * Deletion is always SOFT — deletedAt + deletedById set on the row.
 * The cloud asset is access-restricted (not physically deleted) to preserve
 * the evidence chain during the complaint's active lifecycle.
 */
export const deleteMediaSchema = z.object({
  mediaAssetId: cuidSchema,
});

export type DeleteMediaSchema = z.infer<typeof deleteMediaSchema>;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** All allowed MIME types — re-exported for use in media.constants.ts */
export { ALLOWED_IMAGE_MIMES, ALLOWED_VIDEO_MIMES, ALL_ALLOWED_MIMES };
export { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES };
