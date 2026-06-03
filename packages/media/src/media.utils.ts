/**
 * Media Domain — Utility Functions (Phase 7)
 *
 * Pure functions only. No DB access, no HTTP calls, no side effects.
 * All functions are deterministic given the same inputs.
 *
 * Groups:
 *   1. MIME / file validation helpers
 *   2. SHA-256 hashing helpers
 *   3. Cloudinary URL builders
 *   4. Cloudinary signature generation
 *   5. Upload metadata helpers
 *   6. Evidence integrity helpers
 */
import { createHash } from 'crypto';
import type { MediaAssetDTO, MediaAssetPublicDTO, MediaAssetEmbed } from '@awaaz/types';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MAX_BYTES_BY_MEDIA_TYPE,
  CLOUDINARY_TRANSFORMS,
  buildCloudinaryFolder,
  buildCloudinaryPublicId,
} from './media.constants.js';

// ---------------------------------------------------------------------------
// 1. MIME / file validation helpers
// ---------------------------------------------------------------------------

/**
 * Check if a MIME type is in the server-side whitelist.
 * Returns the mediaType ('IMAGE' | 'VIDEO') it belongs to, or null if rejected.
 */
export function classifyMimeType(mimeType: string): 'IMAGE' | 'VIDEO' | null {
  if ((ALLOWED_IMAGE_MIMES as readonly string[]).includes(mimeType)) return 'IMAGE';
  if ((ALLOWED_VIDEO_MIMES as readonly string[]).includes(mimeType)) return 'VIDEO';
  return null;
}

/**
 * Returns true if the mimeType is consistent with the declared mediaType.
 * A client cannot upload a video file while declaring mediaType = IMAGE.
 */
export function isMimeConsistentWithMediaType(
  mimeType: string,
  mediaType: 'IMAGE' | 'VIDEO',
): boolean {
  const classified = classifyMimeType(mimeType);
  return classified === mediaType;
}

/**
 * Returns true if sizeBytes is within the allowed limit for the given mediaType.
 */
export function isFileSizeAllowed(sizeBytes: number, mediaType: 'IMAGE' | 'VIDEO'): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_BYTES_BY_MEDIA_TYPE[mediaType];
}

/**
 * Human-readable file size for error messages and moderation notes.
 * e.g. 2621440 → "2.50 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// 2. SHA-256 hashing helpers
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hex digest from a Buffer (file bytes).
 * Used server-side when the file bytes are available — e.g. in test environments
 * or if a future direct-streaming upload mode is added.
 *
 * In the standard direct-upload flow, the client computes and sends the hash;
 * the server stores it without recomputing (it never sees the bytes).
 */
export function sha256FromBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validate that a string is a well-formed SHA-256 hex digest:
 *   - exactly 64 characters
 *   - only lowercase hex (0-9, a-f)
 *
 * Mirrors the Zod schema in @awaaz/validation but usable outside Zod context.
 */
export function isValidSha256Hex(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

/**
 * Normalise a SHA-256 hash to lowercase.
 * Guards against clients sending uppercase hex (which is valid SHA-256 encoding
 * but would cause false negatives in duplicate detection).
 */
export function normaliseSha256(hash: string): string {
  return hash.toLowerCase();
}

// ---------------------------------------------------------------------------
// 3. Cloudinary URL builders
// ---------------------------------------------------------------------------

/**
 * Inject a Cloudinary transformation string into a delivery URL.
 *
 * Cloudinary URLs follow the pattern:
 *   https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{publicId}
 *
 * This function inserts the transformation segment between "upload/" and the
 * publicId, or adds it after the last "/" if "upload/" is not found.
 */
export function applyCloudinaryTransform(secureUrl: string, transform: string): string {
  const uploadSegment = '/upload/';
  const uploadIdx = secureUrl.indexOf(uploadSegment);
  if (uploadIdx === -1) return secureUrl;
  const insertAt = uploadIdx + uploadSegment.length;
  return `${secureUrl.slice(0, insertAt)}${transform}/${secureUrl.slice(insertAt)}`;
}

/**
 * Build the optimised full-size image URL for complaint detail view.
 * e.g. https://res.cloudinary.com/…/upload/f_auto,q_auto,w_1920/{publicId}
 */
export function buildOptimizedImageUrl(secureUrl: string): string {
  return applyCloudinaryTransform(secureUrl, CLOUDINARY_TRANSFORMS.IMAGE_OPTIMIZED);
}

/**
 * Build the thumbnail URL for complaint list cards and moderation queue.
 * 400×300 px, cropped to fill — fast to load, consistent dimensions.
 */
export function buildThumbnailUrl(secureUrl: string, mediaType: 'IMAGE' | 'VIDEO'): string {
  const transform =
    mediaType === 'VIDEO'
      ? CLOUDINARY_TRANSFORMS.VIDEO_THUMBNAIL
      : CLOUDINARY_TRANSFORMS.IMAGE_THUMBNAIL;
  return applyCloudinaryTransform(secureUrl, transform);
}

/**
 * Build a blurred low-resolution placeholder shown while moderation is PENDING.
 * Hides sensitive content while still indicating media exists.
 */
export function buildBlurPreviewUrl(secureUrl: string): string {
  return applyCloudinaryTransform(secureUrl, CLOUDINARY_TRANSFORMS.IMAGE_BLUR_PREVIEW);
}

/**
 * Build the mobile-optimised WebP URL.
 * Reduces bandwidth on mobile networks (important for rural India).
 */
export function buildMobileUrl(secureUrl: string): string {
  return applyCloudinaryTransform(secureUrl, CLOUDINARY_TRANSFORMS.IMAGE_MOBILE);
}

// ---------------------------------------------------------------------------
// 4. Cloudinary upload signature generation
// ---------------------------------------------------------------------------

/**
 * Parameters used to compute a Cloudinary upload signature.
 * Only include parameters that are part of the signed payload.
 *
 * IMPORTANT: api_key and file are NOT signed. timestamp IS signed.
 * Parameter names must match Cloudinary's expected format (snake_case).
 */
export type SignableUploadParams = {
  timestamp: number;
  public_id: string;
  folder?: string;
  /** Comma-separated allowed formats e.g. "jpg,png,webp" */
  allowed_formats?: string;
  /** Max file size in bytes (enforced by Cloudinary preset). */
  max_bytes?: number;
  /** Cloudinary upload preset name. */
  upload_preset?: string;
  /** Eager transformation string — applied after upload. */
  eager?: string;
  /** Webhook URL for async eager transform completion. */
  notification_url?: string;
};

/**
 * Serialise upload params to the canonical query string format Cloudinary
 * uses for signature computation:
 *   key1=value1&key2=value2  (sorted alphabetically, no encoding)
 *
 * Cloudinary's signature algorithm:
 *   SHA-1( sorted_params_string + api_secret )
 * where sorted_params_string = keys sorted alphabetically joined by "&".
 *
 * Reference: https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
export function buildSignaturePayload(params: SignableUploadParams): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('&');
}

/**
 * Compute the Cloudinary upload signature (HMAC-SHA1).
 *
 * The signature is computed as:
 *   SHA-1( sorted_params_string + api_secret )
 *
 * The api_secret MUST NEVER be sent to the client.
 * The client receives only { signature, timestamp, api_key, ... }.
 */
export function computeCloudinarySignature(
  params: SignableUploadParams,
  apiSecret: string,
): string {
  const payload = buildSignaturePayload(params) + apiSecret;
  return createHash('sha1').update(payload).digest('hex');
}

/**
 * Generate a Unix timestamp (seconds since epoch) for the upload signature.
 * Cloudinary rejects signatures where |now - timestamp| > UPLOAD_SIGNATURE_TTL_SECONDS.
 */
export function generateSignatureTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// 5. Upload metadata helpers
// ---------------------------------------------------------------------------

/**
 * Determine the Cloudinary resource_type from a MIME type or MediaType.
 * Cloudinary uses 'image' or 'video' — not our app's enum values.
 */
export function toCloudinaryResourceType(mediaType: 'IMAGE' | 'VIDEO'): 'image' | 'video' {
  return mediaType === 'IMAGE' ? 'image' : 'video';
}

/**
 * Parse a EXIF DateTimeOriginal string (YYYY:MM:DD HH:MM:SS) to a JS Date.
 * Returns null if the string is not a valid EXIF datetime.
 *
 * Used when the Cloudinary webhook includes EXIF metadata in the payload.
 * The client may also send capturedAt as a parsed ISO-8601 string, in which
 * case `new Date(isoString)` is sufficient — this handles the EXIF format.
 */
export function parseExifDateTime(exif: string): Date | null {
  // EXIF format: "2024:07:15 14:32:01"
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(exif);
  if (!match) return null;
  const [, year, month, day, hour, min, sec] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Validate that a capturedAt timestamp is plausible:
 *   - Not more than 1 hour in the future (clock skew allowance)
 *   - Not before the smartphone era (2007 = first iPhone year, as a lower bound)
 *
 * Returns null if the date is plausible, or an error message string.
 */
export function validateCapturedAt(capturedAt: Date): string | null {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  const earliestReasonable = new Date('2007-01-01T00:00:00Z');

  if (capturedAt > oneHourFromNow) {
    return 'capturedAt cannot be in the future';
  }
  if (capturedAt < earliestReasonable) {
    return 'capturedAt predates smartphone cameras — value is likely invalid';
  }
  return null;
}

// ---------------------------------------------------------------------------
// 6. Evidence integrity helpers
// ---------------------------------------------------------------------------

/**
 * Determine if a MediaAsset's evidence fields are considered immutable.
 * Once status = READY, publicId, secureUrl, and sha256Hash must not change.
 * Used as a guard in the service / repository update path.
 */
export function isEvidenceLocked(status: string): boolean {
  return status === 'READY' || status === 'DELETED';
}

/**
 * Determine whether a MediaAsset's URL should be visible to a non-owner viewer.
 * An asset is publicly visible only when:
 *   - status is READY (upload confirmed)
 *   - moderationStatus is APPROVED
 *   - deletedAt is null (not soft-deleted)
 *
 * Pending moderation → show blur preview (caller's responsibility).
 * Rejected / deleted → show nothing (403 at CDN level).
 */
export function isAssetPubliclyVisible(
  status: string,
  moderationStatus: string,
  deletedAt: Date | null,
): boolean {
  return status === 'READY' && moderationStatus === 'APPROVED' && deletedAt === null;
}

/**
 * Map a full `MediaAssetDTO` to the public-safe `MediaAssetPublicDTO`.
 * Only called after `isAssetPubliclyVisible` returns true.
 */
export function toPublicDTO(asset: MediaAssetDTO): MediaAssetPublicDTO {
  return {
    id: asset.id,
    mediaType: asset.mediaType,
    secureUrl: asset.secureUrl,
    thumbnailUrl: asset.thumbnailUrl,
    width: asset.width,
    height: asset.height,
    durationSec: asset.durationSec,
    capturedAt: asset.capturedAt,
    sortOrder: asset.sortOrder,
    uploadedAt: asset.uploadedAt,
  };
}

/**
 * Map a full `MediaAssetDTO` to the compact `MediaAssetEmbed` used inside
 * `ComplaintDetail.media`. Strips cloud-provider internals and moderation admin fields.
 */
export function toEmbedDTO(asset: MediaAssetDTO): MediaAssetEmbed {
  return {
    id: asset.id,
    mediaType: asset.mediaType,
    secureUrl: asset.secureUrl,
    thumbnailUrl: asset.thumbnailUrl,
    width: asset.width,
    height: asset.height,
    durationSec: asset.durationSec,
    status: asset.status,
    moderationStatus: asset.moderationStatus,
    sortOrder: asset.sortOrder,
    uploadedAt: asset.uploadedAt,
  };
}

// ---------------------------------------------------------------------------
// Re-export folder / publicId builders from constants for convenience
// (callers can import everything from media.utils without knowing the split)
// ---------------------------------------------------------------------------
export { buildCloudinaryFolder, buildCloudinaryPublicId };
