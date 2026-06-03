/**
 * Media Domain — Constants (Phase 7)
 *
 * Single source of truth for all media-domain configuration values.
 * No imports, no side effects — pure constants only.
 *
 * Mirrors MIME/size constants from @awaaz/validation/src/media.ts to avoid
 * introducing a cross-package runtime dependency from media → validation.
 * If you change one, change both. The values are identical by design.
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const MEDIA_ERROR = {
  // Upload request errors
  UPLOAD_NOT_ALLOWED: 'MEDIA_UPLOAD_NOT_ALLOWED',
  COMPLAINT_NOT_FOUND: 'MEDIA_COMPLAINT_NOT_FOUND',
  COMPLAINT_TERMINAL: 'MEDIA_COMPLAINT_TERMINAL',
  INVALID_MIME_TYPE: 'MEDIA_INVALID_MIME_TYPE',
  FILE_TOO_LARGE: 'MEDIA_FILE_TOO_LARGE',
  PER_COMPLAINT_LIMIT: 'MEDIA_PER_COMPLAINT_LIMIT',
  PER_VIDEO_LIMIT: 'MEDIA_PER_VIDEO_LIMIT',
  DUPLICATE_HASH: 'MEDIA_DUPLICATE_HASH',
  RATE_LIMITED: 'MEDIA_RATE_LIMITED',

  // Confirm upload errors
  ASSET_NOT_FOUND: 'MEDIA_ASSET_NOT_FOUND',
  WRONG_OWNER: 'MEDIA_WRONG_OWNER',
  INVALID_PUBLIC_ID: 'MEDIA_INVALID_PUBLIC_ID',
  ALREADY_CONFIRMED: 'MEDIA_ALREADY_CONFIRMED',
  SHA256_REQUIRED: 'MEDIA_SHA256_REQUIRED',

  // Read / delete errors
  FORBIDDEN: 'MEDIA_FORBIDDEN',
  CANNOT_DELETE_TERMINAL: 'MEDIA_CANNOT_DELETE_TERMINAL',
  PROVIDER_ERROR: 'MEDIA_PROVIDER_ERROR',
} as const;

export type MediaErrorCode = (typeof MEDIA_ERROR)[keyof typeof MEDIA_ERROR];

// ---------------------------------------------------------------------------
// MIME type whitelist
//
// Must stay in sync with @awaaz/validation/src/media.ts.
// Defence-in-depth: server rejects bad types here; cloud upload preset
// enforces the same list at the provider level.
// ---------------------------------------------------------------------------

/** Allowed image MIME types. SVG excluded (XSS vector). GIF excluded (NSFW abuse). */
export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/** Allowed video MIME types. AVI/WMV excluded (legacy desktop formats). */
export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
] as const;

export const ALL_ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];
export type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIMES)[number];
export type AllowedMime = (typeof ALL_ALLOWED_MIMES)[number];

/** Cloudinary-style allowed_formats string (e.g. "jpg,png,webp,heic,heif") */
export const CLOUDINARY_ALLOWED_IMAGE_FORMATS = 'jpg,jpeg,png,webp,heic,heif';
export const CLOUDINARY_ALLOWED_VIDEO_FORMATS = 'mp4,mov,webm,3gp';

// ---------------------------------------------------------------------------
// File size limits (bytes)
//
// Enforced at two layers:
//   1. Server-side validation before issuing upload credentials.
//   2. Cloudinary upload preset (max_bytes param) — cannot be bypassed by client.
// ---------------------------------------------------------------------------

/** Maximum allowed image size: 10 MB */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Maximum allowed video size: 100 MB (≈ 2 min of 1080p mobile video) */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const MAX_BYTES_BY_MEDIA_TYPE: Record<'IMAGE' | 'VIDEO', number> = {
  IMAGE: MAX_IMAGE_BYTES,
  VIDEO: MAX_VIDEO_BYTES,
};

// ---------------------------------------------------------------------------
// Per-complaint media limits
//
// Enforced during createUploadRequest (counted before issuing credentials).
// Prevents storage abuse and keeps complaint pages performant.
// ---------------------------------------------------------------------------

/** Maximum total media assets (images + videos) per complaint. */
export const MAX_MEDIA_PER_COMPLAINT = 5;

/** Maximum video assets per complaint (subset of MAX_MEDIA_PER_COMPLAINT). */
export const MAX_VIDEOS_PER_COMPLAINT = 3;

// ---------------------------------------------------------------------------
// Rate limits (per-user upload requests)
//
// Applied at the tRPC middleware layer on the createUploadRequest procedure.
// Limits are on REQUESTS (credential issuance), not on confirmed uploads.
// ---------------------------------------------------------------------------

/** Max upload credential requests per user per 15-minute sliding window. */
export const RATE_LIMIT_REQUESTS_PER_15_MIN = 10;

/** Max upload credential requests per user per 24-hour sliding window. */
export const RATE_LIMIT_REQUESTS_PER_DAY = 50;

// ---------------------------------------------------------------------------
// Signed upload credential TTL
//
// Cloudinary upload signatures are HMAC-SHA1 of params including a Unix
// timestamp. The provider rejects requests where |now - timestamp| > TTL.
// ---------------------------------------------------------------------------

/** Signed upload credential validity window in seconds (10 minutes). */
export const UPLOAD_SIGNATURE_TTL_SECONDS = 600;

// ---------------------------------------------------------------------------
// Cloudinary folder / key structure
//
// Assets are stored under:
//   awaaz/{environment}/complaints/{complaintId}/{mediaAssetId}
//
// Benefits:
//   • Complaint-scoped: easy bulk delete/access-revoke when complaint is purged.
//   • Environment-scoped: prod / staging assets are isolated.
//   • Asset-scoped: each upload has a globally unique publicId.
// ---------------------------------------------------------------------------

export const CLOUDINARY_ROOT_FOLDER = 'awaaz' as const;

/**
 * Build the Cloudinary folder path for a complaint's media.
 * The environment segment (prod/staging/dev) prevents cross-env collisions.
 */
export function buildCloudinaryFolder(
  complaintId: string,
  env: string = process.env['NODE_ENV'] ?? 'development',
): string {
  return `${CLOUDINARY_ROOT_FOLDER}/${env}/complaints/${complaintId}`;
}

/**
 * Build the Cloudinary publicId for a specific media asset.
 * Embeds the complaint + asset ids so the asset can be found or revoked
 * without a database lookup from the Cloudinary dashboard.
 */
export function buildCloudinaryPublicId(complaintId: string, mediaAssetId: string): string {
  return `${buildCloudinaryFolder(complaintId)}/${mediaAssetId}`;
}

// ---------------------------------------------------------------------------
// Cloudinary URL transformation recipes
//
// These are appended to the base delivery URL via URL-based transformations.
// No API call needed — Cloudinary applies them on-the-fly at the CDN edge.
// ---------------------------------------------------------------------------

export const CLOUDINARY_TRANSFORMS = {
  /** Full-quality optimised image for complaint detail view. */
  IMAGE_OPTIMIZED: 'f_auto,q_auto,w_1920',
  /** Thumbnail for complaint list cards and moderation queue. */
  IMAGE_THUMBNAIL: 'f_auto,q_auto,w_400,h_300,c_fill',
  /** Low-res blurred preview shown while moderation is PENDING. */
  IMAGE_BLUR_PREVIEW: 'e_blur:300,q_10,w_200',
  /** WebP-optimised for mobile browsers. */
  IMAGE_MOBILE: 'f_webp,q_auto,w_800',
  /** Video poster frame (thumbnail extracted at 0s). */
  VIDEO_THUMBNAIL: 'f_jpg,so_0,w_400,h_300,c_fill',
  /** Compressed video for streaming playback. */
  VIDEO_COMPRESSED: 'f_mp4,vc_h264,ac_aac,q_auto',
} as const;

/**
 * Eager transformations to request during video upload.
 * Cloudinary processes these server-side after the upload completes and
 * sends the result via the webhook notification URL.
 * Applied as a comma-joined transformation string in the upload params.
 */
export const VIDEO_EAGER_TRANSFORMATIONS = [
  CLOUDINARY_TRANSFORMS.VIDEO_COMPRESSED,
  CLOUDINARY_TRANSFORMS.VIDEO_THUMBNAIL,
].join('|');

// ---------------------------------------------------------------------------
// Cloudinary access control
//
// Used when an asset must be access-restricted (soft-delete, moderation
// REJECTED). The upload_preset is set via the Cloudinary dashboard and maps
// to `awaaz_evidence_preset`.
// ---------------------------------------------------------------------------

/** Cloudinary upload preset name — configured in the Cloudinary dashboard. */
export const CLOUDINARY_UPLOAD_PRESET = 'awaaz_evidence';

/**
 * Cloudinary resource types by MediaType.
 * Used when calling cloudinary.api.update() to set access_control.
 */
export const CLOUDINARY_RESOURCE_TYPE: Record<'IMAGE' | 'VIDEO', 'image' | 'video'> = {
  IMAGE: 'image',
  VIDEO: 'video',
};

// ---------------------------------------------------------------------------
// Complaint lifecycle — upload-allowed statuses
//
// Citizens may only upload evidence while the complaint is in a mutable state.
// Uploads are blocked once the complaint reaches a terminal status.
// ---------------------------------------------------------------------------

/** Complaint statuses during which evidence uploads are accepted. */
export const UPLOAD_ALLOWED_STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] as const;

export type UploadAllowedStatus = (typeof UPLOAD_ALLOWED_STATUSES)[number];

/** Complaint statuses that are terminal — uploads blocked. */
export const UPLOAD_BLOCKED_STATUSES = ['RESOLVED', 'VERIFIED', 'REJECTED'] as const;

// ---------------------------------------------------------------------------
// Evidence retention policy
//
// Physical Cloudinary deletion is ONLY performed by a scheduled retention
// job AFTER the complaint reaches a terminal state AND the retention period
// has elapsed. All other deletions are soft (access-control only).
// ---------------------------------------------------------------------------

/** Minimum days to retain media assets after complaint reaches terminal state. */
export const EVIDENCE_RETENTION_DAYS = 365 * 7; // 7 years (legal requirement)

// ---------------------------------------------------------------------------
// Moderation queue labels
// ---------------------------------------------------------------------------

export const MODERATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Awaiting Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const MEDIA_STATUS_LABEL: Record<string, string> = {
  UPLOADING: 'Upload in Progress',
  READY: 'Ready',
  FAILED: 'Upload Failed',
  DELETED: 'Deleted',
};
