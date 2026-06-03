/**
 * Media Service — Phase 7
 *
 * Orchestrates all media upload operations:
 *   • Authorization enforcement (CITIZEN = own complaints only, MLA = read assigned,
 *     ADMIN = full access)
 *   • Business rule validation (limits, complaint status gate, duplicate detection)
 *   • Cloud provider calls (via CloudProviderAdapter interface — never cloudinary directly)
 *   • Prisma writes (via MediaRepository — never db directly)
 *   • Domain event publishing (fire-and-forget, never throws)
 *
 * Evidence-integrity guarantees:
 *   • publicId issued by this server is verified in confirmUpload (prevents forgery)
 *   • SHA-256 hash is stored immutably after confirmation
 *   • Deletions are always soft — revokeAccess() at cloud level + deletedAt in DB
 */
import { TRPCError } from '@trpc/server';
import { createId } from '@paralleldrive/cuid2';
import type { AuthUser, CloudProviderAdapter } from '@awaaz/types';
import type {
  CreateUploadRequestInput,
  ConfirmUploadInput,
  GetMediaByComplaintInput,
  DeleteMediaInput,
  CreateUploadRequestResult,
  ConfirmUploadResult,
  GetMediaByComplaintResult,
  DeleteMediaResult,
  MediaAssetDTO,
} from '@awaaz/types';
import type { EventPublisher } from '@awaaz/events';
import { EVENT_TYPE, buildEvent } from '@awaaz/events';
import {
  MEDIA_ERROR,
  UPLOAD_ALLOWED_STATUSES,
  MAX_MEDIA_PER_COMPLAINT,
  MAX_VIDEOS_PER_COMPLAINT,
  MAX_BYTES_BY_MEDIA_TYPE,
  CLOUDINARY_ALLOWED_IMAGE_FORMATS,
  CLOUDINARY_ALLOWED_VIDEO_FORMATS,
  VIDEO_EAGER_TRANSFORMATIONS,
  buildCloudinaryFolder,
  buildCloudinaryPublicId,
} from './media.constants.js';
import {
  isFileSizeAllowed,
  isMimeConsistentWithMediaType,
  isAssetPubliclyVisible,
  toPublicDTO,
  normaliseSha256,
  validateCapturedAt,
} from './media.utils.js';
import type { MediaRepository } from './media.repository.js';

// ---------------------------------------------------------------------------
// MediaService
// ---------------------------------------------------------------------------

export class MediaService {
  constructor(
    private readonly repo: MediaRepository,
    private readonly cloudAdapter: CloudProviderAdapter,
    /** Fire-and-forget event publisher. Null = Redis not available (dev/test). */
    private readonly events: EventPublisher | null,
  ) {}

  // ------------------------------------------------------------------
  // media.createUploadRequest
  // ------------------------------------------------------------------

  /**
   * Validates the upload request, enforces all limits, and issues signed
   * cloud upload credentials. The server NEVER touches file bytes.
   *
   * Authorization: CITIZEN only — MLA and ADMIN cannot upload evidence.
   */
  async createUploadRequest(
    user: AuthUser,
    input: CreateUploadRequestInput,
  ): Promise<CreateUploadRequestResult> {
    // ── Authorization ──────────────────────────────────────────────────────
    if (user.role !== 'citizen') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: MEDIA_ERROR.UPLOAD_NOT_ALLOWED,
      });
    }

    // ── Validate MIME consistency ──────────────────────────────────────────
    if (!isMimeConsistentWithMediaType(input.mimeType, input.mediaType)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: MEDIA_ERROR.INVALID_MIME_TYPE,
      });
    }

    // ── Validate file size ─────────────────────────────────────────────────
    if (!isFileSizeAllowed(input.sizeBytes, input.mediaType)) {
      const maxMB = MAX_BYTES_BY_MEDIA_TYPE[input.mediaType] / (1024 * 1024);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `${MEDIA_ERROR.FILE_TOO_LARGE}: max ${maxMB} MB for ${input.mediaType}`,
      });
    }

    // ── Complaint ownership + status gate ──────────────────────────────────
    const complaint = await this.repo.findComplaintMeta(input.complaintId);
    if (!complaint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: MEDIA_ERROR.COMPLAINT_NOT_FOUND,
      });
    }

    if (complaint.citizenId !== user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: MEDIA_ERROR.UPLOAD_NOT_ALLOWED,
      });
    }

    if (!(UPLOAD_ALLOWED_STATUSES as readonly string[]).includes(complaint.status)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: MEDIA_ERROR.COMPLAINT_TERMINAL,
      });
    }

    // ── Per-complaint media count limits ───────────────────────────────────
    const totalCount = await this.repo.countByComplaint(input.complaintId);
    if (totalCount >= MAX_MEDIA_PER_COMPLAINT) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `${MEDIA_ERROR.PER_COMPLAINT_LIMIT}: max ${MAX_MEDIA_PER_COMPLAINT} files per complaint`,
      });
    }

    if (input.mediaType === 'VIDEO') {
      const videoCount = await this.repo.countVideosByComplaint(input.complaintId);
      if (videoCount >= MAX_VIDEOS_PER_COMPLAINT) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${MEDIA_ERROR.PER_VIDEO_LIMIT}: max ${MAX_VIDEOS_PER_COMPLAINT} videos per complaint`,
        });
      }
    }

    // ── Early duplicate detection (if hash provided) ───────────────────────
    if (input.sha256HashEarly) {
      const normHash = normaliseSha256(input.sha256HashEarly);
      const isDuplicate = await this.repo.existsByHash(input.complaintId, normHash);
      if (isDuplicate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: MEDIA_ERROR.DUPLICATE_HASH,
        });
      }
    }

    // ── Generate asset id + upload session token ───────────────────────────
    // Pre-generate the asset id so it can be embedded in the Cloudinary publicId.
    // This makes the asset traceable from the Cloudinary dashboard without a DB lookup.
    const assetId = createId();
    const pendingUploadToken = createId();

    const folder = buildCloudinaryFolder(input.complaintId);
    const publicId = buildCloudinaryPublicId(input.complaintId, assetId);

    const allowedFormats =
      input.mediaType === 'IMAGE'
        ? CLOUDINARY_ALLOWED_IMAGE_FORMATS
        : CLOUDINARY_ALLOWED_VIDEO_FORMATS;

    // ── Generate signed upload params (server-side only) ───────────────────
    const uploadParams = await this.cloudAdapter.generateUploadParams(publicId, {
      folder,
      mediaType: input.mediaType,
      maxBytes: MAX_BYTES_BY_MEDIA_TYPE[input.mediaType],
      allowedFormats,
      // Video: request eager transcoding + thumbnail on Cloudinary's servers
      ...(input.mediaType === 'VIDEO' ? { eagerTransformations: VIDEO_EAGER_TRANSFORMATIONS } : {}),
    });

    // ── Persist the pending upload record ─────────────────────────────────
    await this.repo.createAsset({
      id: assetId,
      complaintId: input.complaintId,
      uploadedById: user.id,
      mediaType: input.mediaType,
      originalFileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      cloudProvider: 'CLOUDINARY',
      publicId,
      pendingUploadToken,
      sortOrder: totalCount,
      ...(input.sha256HashEarly ? { sha256Hash: normaliseSha256(input.sha256HashEarly) } : {}),
    });

    return {
      mediaAssetId: assetId,
      uploadUrl: uploadParams.uploadUrl,
      apiKey: uploadParams.apiKey,
      signature: uploadParams.signature,
      timestamp: uploadParams.timestamp,
      publicId: uploadParams.publicId,
      folder: uploadParams.folder,
      cloudProvider: uploadParams.cloudProvider,
    };
  }

  // ------------------------------------------------------------------
  // media.confirmUpload
  // ------------------------------------------------------------------

  /**
   * Confirms a completed direct upload.
   *
   * Security chain:
   *   1. Asset must belong to the calling user.
   *   2. Asset must be in UPLOADING state (prevents double-confirmation).
   *   3. publicId must match the server-issued value (prevents forgery).
   *   4. sha256Hash is normalised and stored immutably.
   *   5. capturedAt is validated for plausibility.
   *
   * After confirmation, the asset's moderationStatus is PENDING.
   * It becomes visible to non-owners only after moderation APPROVED.
   */
  async confirmUpload(user: AuthUser, input: ConfirmUploadInput): Promise<ConfirmUploadResult> {
    // ── Load asset ─────────────────────────────────────────────────────────
    const asset = await this.repo.findById(input.mediaAssetId);
    if (!asset) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: MEDIA_ERROR.ASSET_NOT_FOUND,
      });
    }

    // ── Ownership check ────────────────────────────────────────────────────
    if (asset.uploadedById !== user.id && user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: MEDIA_ERROR.WRONG_OWNER,
      });
    }

    // ── State check — must still be UPLOADING ─────────────────────────────
    if (asset.status !== 'UPLOADING') {
      throw new TRPCError({
        code: 'CONFLICT',
        message: MEDIA_ERROR.ALREADY_CONFIRMED,
      });
    }

    // ── publicId integrity: must match the server-issued value ─────────────
    if (asset.publicId !== input.publicId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: MEDIA_ERROR.INVALID_PUBLIC_ID,
      });
    }

    // ── SHA-256 hash — must be present (either from request or confirm) ────
    const sha256Hash = input.sha256Hash
      ? normaliseSha256(input.sha256Hash)
      : (asset.sha256Hash ?? undefined);

    if (!sha256Hash) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: MEDIA_ERROR.SHA256_REQUIRED,
      });
    }

    // ── capturedAt plausibility ─────────────────────────────────────────────
    if (input.capturedAt) {
      const capturedErr = validateCapturedAt(input.capturedAt);
      if (capturedErr) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: capturedErr });
      }
    }

    // ── Confirm in DB (atomic: UPLOADING→READY, token cleared) ────────────
    const confirmed = await this.repo.confirmAsset(input.mediaAssetId, {
      secureUrl: input.secureUrl,
      thumbnailUrl: input.metadata.thumbnailUrl,
      width: input.metadata.width,
      height: input.metadata.height,
      durationSec: input.metadata.durationSec,
      sizeBytes: input.metadata.sizeBytes,
      sha256Hash,
      capturedAt: input.capturedAt,
    });

    if (!confirmed) {
      // Race condition — already confirmed by another request
      throw new TRPCError({
        code: 'CONFLICT',
        message: MEDIA_ERROR.ALREADY_CONFIRMED,
      });
    }

    // ── Publish MEDIA_UPLOADED event (fire-and-forget) ────────────────────
    await this.events?.publish(
      buildEvent(
        EVENT_TYPE.MEDIA_UPLOADED,
        {
          mediaAssetId: confirmed.id,
          complaintId: confirmed.complaintId,
          uploadedById: confirmed.uploadedById,
          mediaType: confirmed.mediaType,
          mimeType: confirmed.mimeType,
          sizeBytes: confirmed.sizeBytes,
          sha256Hash: confirmed.sha256Hash,
        },
        createId(),
      ),
    );

    return { asset: confirmed };
  }

  // ------------------------------------------------------------------
  // media.getMediaByComplaint
  // ------------------------------------------------------------------

  /**
   * Returns media assets for a complaint with role-based visibility:
   *
   *   CITIZEN (owner)  → full DTOs for all own assets
   *   MLA              → public DTOs for APPROVED assets only
   *   ADMIN            → full DTOs for all assets including deleted
   *
   * Non-owners never see UPLOADING, FAILED, DELETED, or REJECTED assets.
   */
  async getMediaByComplaint(
    user: AuthUser,
    input: GetMediaByComplaintInput,
  ): Promise<GetMediaByComplaintResult> {
    const complaint = await this.repo.findComplaintMeta(input.complaintId);
    if (!complaint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: MEDIA_ERROR.COMPLAINT_NOT_FOUND,
      });
    }

    const isOwner = complaint.citizenId === user.id;
    const isAdmin = user.role === 'admin';

    // CITIZEN must own the complaint to see media
    if (user.role === 'citizen' && !isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: MEDIA_ERROR.FORBIDDEN,
      });
    }

    const assets = await this.repo.listByComplaint(input.complaintId);

    if (isAdmin || isOwner) {
      return { assets, total: assets.length };
    }

    // MLA / other authenticated roles: public-safe DTOs, APPROVED only
    const publicAssets = assets
      .filter((a) => isAssetPubliclyVisible(a.status, a.moderationStatus, a.deletedAt))
      .map(toPublicDTO);

    return { assets: publicAssets, total: publicAssets.length };
  }

  // ------------------------------------------------------------------
  // media.deleteMedia
  // ------------------------------------------------------------------

  /**
   * Soft-deletes a media asset.
   *
   * Authorization:
   *   CITIZEN → may delete own uploads in UPLOADING or READY state,
   *             as long as the complaint is not in a terminal status.
   *   ADMIN   → may delete any asset in any state.
   *
   * After DB soft-delete, cloud access is revoked (non-fatal if provider errors).
   * MEDIA_DELETED event is published for audit trail.
   */
  async deleteMedia(user: AuthUser, input: DeleteMediaInput): Promise<DeleteMediaResult> {
    const asset = await this.repo.findById(input.mediaAssetId);
    if (!asset) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: MEDIA_ERROR.ASSET_NOT_FOUND,
      });
    }

    const isAdmin = user.role === 'admin';
    const isOwner = asset.uploadedById === user.id;

    // ── Authorization ──────────────────────────────────────────────────────
    if (!isAdmin && !isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: MEDIA_ERROR.FORBIDDEN,
      });
    }

    // Citizens cannot delete in terminal complaint states
    if (!isAdmin) {
      const complaint = await this.repo.findComplaintMeta(asset.complaintId);
      if (complaint && !(UPLOAD_ALLOWED_STATUSES as readonly string[]).includes(complaint.status)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: MEDIA_ERROR.CANNOT_DELETE_TERMINAL,
        });
      }

      // Citizens can only delete UPLOADING or READY assets
      if (asset.status !== 'UPLOADING' && asset.status !== 'READY') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: MEDIA_ERROR.CANNOT_DELETE_TERMINAL,
        });
      }
    }

    // ── Soft-delete in DB ──────────────────────────────────────────────────
    const deleted = await this.repo.softDelete(input.mediaAssetId, user.id);
    if (!deleted) {
      // Already deleted — idempotent success
      return { success: true, assetId: input.mediaAssetId };
    }

    // ── Revoke cloud access (evidence bytes preserved) ────────────────────
    // Non-fatal: even if Cloudinary API call fails, the DB soft-delete
    // has already happened. A background job can retry the revoke later.
    try {
      await this.cloudAdapter.revokeAccess(deleted.publicId, deleted.mediaType);
    } catch (err) {
      console.error('[MediaService] revokeAccess failed for asset', deleted.id, err);
    }

    // ── Publish MEDIA_DELETED event (fire-and-forget) ─────────────────────
    await this.events?.publish(
      buildEvent(
        EVENT_TYPE.MEDIA_DELETED,
        {
          mediaAssetId: deleted.id,
          complaintId: deleted.complaintId,
          deletedById: user.id,
          mediaType: deleted.mediaType,
          reason: isAdmin ? 'admin_removal' : 'citizen_request',
        },
        createId(),
      ),
    );

    return { success: true, assetId: deleted.id };
  }

  // ------------------------------------------------------------------
  // Internal helpers exposed for the admin moderation flow (future)
  // ------------------------------------------------------------------

  /**
   * Returns the moderation queue — PENDING + READY assets, oldest first.
   * ADMIN only — called by a future admin panel procedure.
   */
  async getModerationQueue(
    user: AuthUser,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<MediaAssetDTO[]> {
    if (user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: MEDIA_ERROR.FORBIDDEN });
    }
    return this.repo.listPendingModeration(opts);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMediaService(
  repo: MediaRepository,
  cloudAdapter: CloudProviderAdapter,
  events: EventPublisher | null,
): MediaService {
  return new MediaService(repo, cloudAdapter, events);
}
