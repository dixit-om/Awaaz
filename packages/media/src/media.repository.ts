/**
 * Media Repository — Phase 7
 *
 * All Prisma interactions for the MediaAsset model.
 * Pure data-access layer — no business logic, no authorization, no HTTP calls.
 *
 * Evidence-integrity invariants enforced here:
 *   • createAsset sets status=UPLOADING + pendingUploadToken; both are immutable
 *     until confirmAsset is called.
 *   • confirmAsset clears pendingUploadToken atomically with the status flip.
 *   • softDelete sets deletedAt + deletedById — never physically removes a row.
 *   • No method ever calls db.mediaAsset.delete() — physical deletion is reserved
 *     for the scheduled retention job (not yet implemented).
 */
import type { PrismaClient, Prisma } from '@awaaz/db';
import type {
  MediaAssetDTO,
  MediaAssetEmbed,
  MediaStatus,
  ModerationStatus,
  CloudProvider,
} from '@awaaz/types';

// ---------------------------------------------------------------------------
// Prisma select fragments
// ---------------------------------------------------------------------------

/**
 * Full select — all fields needed to produce a MediaAssetDTO.
 * Used by createAsset, confirmAsset, findById, and softDelete return values.
 */
const assetFullSelect = {
  id: true,
  complaintId: true,
  uploadedById: true,
  mediaType: true,
  originalFileName: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  durationSec: true,
  sha256Hash: true,
  capturedAt: true,
  cloudProvider: true,
  publicId: true,
  secureUrl: true,
  thumbnailUrl: true,
  cdnUrl: true,
  status: true,
  moderationStatus: true,
  moderationNotes: true,
  moderatedById: true,
  moderatedAt: true,
  sortOrder: true,
  uploadedAt: true,
  deletedAt: true,
  deletedById: true,
} satisfies Prisma.MediaAssetSelect;

/**
 * Embed select — minimal fields for ComplaintDetail.media.
 * Intentionally omits cloud-provider internals and owner PII.
 */
const assetEmbedSelect = {
  id: true,
  mediaType: true,
  secureUrl: true,
  thumbnailUrl: true,
  width: true,
  height: true,
  durationSec: true,
  status: true,
  moderationStatus: true,
  sortOrder: true,
  uploadedAt: true,
} satisfies Prisma.MediaAssetSelect;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

type AssetFullRow = Prisma.MediaAssetGetPayload<{ select: typeof assetFullSelect }>;
type AssetEmbedRow = Prisma.MediaAssetGetPayload<{ select: typeof assetEmbedSelect }>;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toDTO(row: AssetFullRow): MediaAssetDTO {
  return {
    id: row.id,
    complaintId: row.complaintId,
    uploadedById: row.uploadedById,
    mediaType: row.mediaType as 'IMAGE' | 'VIDEO',
    originalFileName: row.originalFileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    durationSec: row.durationSec,
    sha256Hash: row.sha256Hash,
    capturedAt: row.capturedAt,
    cloudProvider: row.cloudProvider as CloudProvider,
    publicId: row.publicId,
    secureUrl: row.secureUrl,
    thumbnailUrl: row.thumbnailUrl,
    cdnUrl: row.cdnUrl,
    status: row.status as MediaStatus,
    moderationStatus: row.moderationStatus as ModerationStatus,
    moderationNotes: row.moderationNotes,
    moderatedById: row.moderatedById,
    moderatedAt: row.moderatedAt,
    sortOrder: row.sortOrder,
    uploadedAt: row.uploadedAt,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
  };
}

function toEmbed(row: AssetEmbedRow): MediaAssetEmbed {
  return {
    id: row.id,
    mediaType: row.mediaType as 'IMAGE' | 'VIDEO',
    secureUrl: row.secureUrl,
    thumbnailUrl: row.thumbnailUrl,
    width: row.width,
    height: row.height,
    durationSec: row.durationSec,
    status: row.status as MediaStatus,
    moderationStatus: row.moderationStatus as ModerationStatus,
    sortOrder: row.sortOrder,
    uploadedAt: row.uploadedAt,
  };
}

// ---------------------------------------------------------------------------
// Input types for repository methods
// ---------------------------------------------------------------------------

/** Data required to insert a new MediaAsset row in UPLOADING state. */
export type CreateAssetData = {
  /** Pre-generated CUID2 — allows the caller to build publicId before the DB write. */
  id: string;
  complaintId: string;
  uploadedById: string;
  mediaType: 'IMAGE' | 'VIDEO';
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  cloudProvider: CloudProvider;
  /** Server-issued nonce — matched during confirmAsset for integrity. */
  pendingUploadToken: string;
  /** Pre-assigned publicId (matches the token sent to Cloudinary). */
  publicId: string;
  /** Upload sort order within the complaint. */
  sortOrder: number;
  /** Optional: hash pre-computed by client at request time. */
  sha256Hash?: string;
};

/** Data supplied during upload confirmation. */
export type ConfirmAssetData = {
  /** Authoritative delivery URL from Cloudinary. */
  secureUrl: string;
  /** Thumbnail URL from eager transform — null if not yet generated. */
  thumbnailUrl?: string;
  /** Authoritative dimensions from Cloudinary (overrides declared values). */
  width?: number;
  height?: number;
  /** Video duration in seconds (null for images). */
  durationSec?: number;
  /**
   * Actual size bytes confirmed by provider.
   * May differ slightly from declared value after transcoding.
   */
  sizeBytes?: number;
  /** SHA-256 hex digest — required by confirmation step. */
  sha256Hash?: string;
  /** EXIF capture timestamp — optional, stripped from many devices. */
  capturedAt?: Date;
};

/** Data for updating moderation decision. */
export type ModerateAssetData = {
  moderationStatus: 'APPROVED' | 'REJECTED';
  moderationNotes?: string;
  moderatedById: string;
};

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class MediaRepository {
  constructor(private readonly db: PrismaClient) {}

  // ------------------------------------------------------------------
  // Reads
  // ------------------------------------------------------------------

  /**
   * Find a single MediaAsset by id.
   * Returns null if not found or soft-deleted (unless includeSoftDeleted = true).
   */
  async findById(
    id: string,
    opts: { includeSoftDeleted?: boolean } = {},
  ): Promise<MediaAssetDTO | null> {
    const row = await this.db.mediaAsset.findUnique({
      where: {
        id,
        ...(opts.includeSoftDeleted ? {} : { deletedAt: null }),
      },
      select: assetFullSelect,
    });
    return row ? toDTO(row) : null;
  }

  /**
   * Find a MediaAsset by the server-issued pendingUploadToken.
   * Used during confirmAsset to look up the in-flight upload record.
   * Returns null if no matching token (token already consumed or never issued).
   */
  async findByToken(token: string): Promise<MediaAssetDTO | null> {
    const row = await this.db.mediaAsset.findUnique({
      where: { pendingUploadToken: token },
      select: assetFullSelect,
    });
    return row ? toDTO(row) : null;
  }

  /**
   * List all active (non-deleted) media assets for a complaint, ordered by sortOrder.
   * Returns full DTOs — caller (service) applies visibility filtering.
   */
  async listByComplaint(complaintId: string): Promise<MediaAssetDTO[]> {
    const rows = await this.db.mediaAsset.findMany({
      where: { complaintId, deletedAt: null },
      select: assetFullSelect,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toDTO);
  }

  /**
   * List media assets in the embed shape (for complaint detail response).
   * Only returns READY assets — UPLOADING / FAILED are omitted from complaint views.
   */
  async listEmbedByComplaint(complaintId: string): Promise<MediaAssetEmbed[]> {
    const rows = await this.db.mediaAsset.findMany({
      where: {
        complaintId,
        deletedAt: null,
        status: 'READY',
      },
      select: assetEmbedSelect,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toEmbed);
  }

  /**
   * Count active (non-deleted) media assets for a complaint.
   * Used to enforce MAX_MEDIA_PER_COMPLAINT before issuing new upload credentials.
   */
  async countByComplaint(complaintId: string): Promise<number> {
    return this.db.mediaAsset.count({
      where: { complaintId, deletedAt: null },
    });
  }

  /**
   * Count active video assets for a complaint.
   * Used to enforce MAX_VIDEOS_PER_COMPLAINT.
   */
  async countVideosByComplaint(complaintId: string): Promise<number> {
    return this.db.mediaAsset.count({
      where: { complaintId, deletedAt: null, mediaType: 'VIDEO' },
    });
  }

  /**
   * Check for duplicate uploads within a complaint based on SHA-256 hash.
   * Returns true if an active, non-failed asset with the same hash already exists.
   * Called before issuing upload credentials when sha256HashEarly is provided.
   */
  async existsByHash(complaintId: string, sha256Hash: string): Promise<boolean> {
    const count = await this.db.mediaAsset.count({
      where: {
        complaintId,
        sha256Hash,
        deletedAt: null,
        status: { not: 'FAILED' },
      },
    });
    return count > 0;
  }

  /**
   * Find an in-flight UPLOADING asset for the same complaint + hash + owner.
   * Used to re-issue credentials when confirmUpload failed but the DB row exists.
   */
  async findUploadingByHash(
    complaintId: string,
    sha256Hash: string,
    uploadedById: string,
  ): Promise<MediaAssetDTO | null> {
    const row = await this.db.mediaAsset.findFirst({
      where: {
        complaintId,
        sha256Hash,
        uploadedById,
        deletedAt: null,
        status: 'UPLOADING',
      },
      select: assetFullSelect,
    });
    return row ? toDTO(row) : null;
  }

  /**
   * Fetch the complaint's current status (and citizen id for ownership check).
   * Used by the service layer to enforce UPLOAD_ALLOWED_STATUSES.
   */
  async findComplaintMeta(
    complaintId: string,
  ): Promise<{ status: string; citizenId: string } | null> {
    return this.db.complaint.findUnique({
      where: { id: complaintId, deletedAt: null },
      select: { status: true, citizenId: true },
    });
  }

  /**
   * Moderation queue: fetch all assets awaiting review, oldest first.
   * Used by the future admin moderation dashboard.
   */
  async listPendingModeration(
    opts: { limit?: number; offset?: number } = {},
  ): Promise<MediaAssetDTO[]> {
    const rows = await this.db.mediaAsset.findMany({
      where: {
        moderationStatus: 'PENDING',
        status: 'READY',
        deletedAt: null,
      },
      select: assetFullSelect,
      orderBy: { uploadedAt: 'asc' },
      take: opts.limit ?? 50,
      skip: opts.offset ?? 0,
    });
    return rows.map(toDTO);
  }

  // ------------------------------------------------------------------
  // Writes
  // ------------------------------------------------------------------

  /**
   * Insert a new MediaAsset row in UPLOADING state.
   *
   * Called by the service after validating the upload request.
   * The pendingUploadToken is set here; it is the server-issued nonce that
   * must be matched in confirmAsset to prevent publicId forgery.
   */
  async createAsset(data: CreateAssetData): Promise<MediaAssetDTO> {
    const row = await this.db.mediaAsset.create({
      data: {
        id: data.id,
        complaintId: data.complaintId,
        uploadedById: data.uploadedById,
        mediaType: data.mediaType,
        originalFileName: data.originalFileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        cloudProvider: data.cloudProvider,
        publicId: data.publicId,
        pendingUploadToken: data.pendingUploadToken,
        sortOrder: data.sortOrder,
        sha256Hash: data.sha256Hash ?? null,
        status: 'UPLOADING',
        moderationStatus: 'PENDING',
      },
      select: assetFullSelect,
    });
    return toDTO(row);
  }

  /**
   * Confirm a direct upload — atomically:
   *   1. Flips status: UPLOADING → READY
   *   2. Clears pendingUploadToken (single-use nonce — prevents replay)
   *   3. Populates metadata from the cloud provider's authoritative values
   *
   * The WHERE clause requires:
   *   - Matching id (caller's record)
   *   - status = UPLOADING (prevents double-confirmation)
   *
   * Returns null if the record is not found or already confirmed (idempotency).
   */
  async confirmAsset(id: string, data: ConfirmAssetData): Promise<MediaAssetDTO | null> {
    try {
      const row = await this.db.mediaAsset.update({
        where: {
          id,
          status: 'UPLOADING',
        },
        data: {
          status: 'READY',
          pendingUploadToken: null,
          secureUrl: data.secureUrl,
          thumbnailUrl: data.thumbnailUrl ?? null,
          ...(data.width !== undefined ? { width: data.width } : {}),
          ...(data.height !== undefined ? { height: data.height } : {}),
          ...(data.durationSec !== undefined ? { durationSec: data.durationSec } : {}),
          ...(data.sizeBytes !== undefined ? { sizeBytes: data.sizeBytes } : {}),
          ...(data.sha256Hash ? { sha256Hash: data.sha256Hash } : {}),
          ...(data.capturedAt ? { capturedAt: data.capturedAt } : {}),
        },
        select: assetFullSelect,
      });
      return toDTO(row);
    } catch (err) {
      // Prisma P2025: record not found or WHERE condition not matched
      // (already confirmed or doesn't exist) — treat as idempotent non-error
      const prismaError = err as { code?: string };
      if (prismaError?.code === 'P2025') return null;
      throw err;
    }
  }

  /**
   * Mark a MediaAsset as FAILED.
   * Called when the client reports a failed upload, or when confirmAsset
   * times out (future: a scheduled job sweeps UPLOADING assets older than TTL).
   */
  async markFailed(id: string): Promise<void> {
    await this.db.mediaAsset.updateMany({
      where: { id, status: 'UPLOADING' },
      data: { status: 'FAILED', pendingUploadToken: null },
    });
  }

  /**
   * Soft-delete a MediaAsset.
   *
   * Evidence preservation rules:
   *   • deletedAt and deletedById are set — the row persists forever.
   *   • status is set to DELETED to prevent it appearing in normal queries.
   *   • The cloud asset bytes are NOT deleted here — the service layer calls
   *     cloudAdapter.revokeAccess() after this update to block delivery.
   *
   * Returns the updated DTO so the service can log the EventLog entry.
   * Returns null if the asset is already deleted or not found.
   */
  async softDelete(id: string, deletedById: string): Promise<MediaAssetDTO | null> {
    try {
      const row = await this.db.mediaAsset.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          deletedById,
        },
        select: assetFullSelect,
      });
      return toDTO(row);
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError?.code === 'P2025') return null;
      throw err;
    }
  }

  /**
   * Update moderation decision for an asset.
   *
   * Only assets in status = READY can be moderated.
   * If REJECTED, the service layer calls cloudAdapter.revokeAccess() after this update.
   * moderatedAt is set to now() — provides an audit timestamp for the decision.
   *
   * Returns the updated DTO or null if the asset is not in a moderatable state.
   */
  async updateModeration(id: string, data: ModerateAssetData): Promise<MediaAssetDTO | null> {
    try {
      const row = await this.db.mediaAsset.update({
        where: {
          id,
          status: 'READY',
          deletedAt: null,
        },
        data: {
          moderationStatus: data.moderationStatus,
          moderationNotes: data.moderationNotes ?? null,
          moderatedById: data.moderatedById,
          moderatedAt: new Date(),
        },
        select: assetFullSelect,
      });
      return toDTO(row);
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError?.code === 'P2025') return null;
      throw err;
    }
  }

  /**
   * Sweep stale UPLOADING assets older than `olderThanMs` milliseconds.
   * Returns the ids of records that were marked FAILED.
   *
   * Called by a scheduled job to recover from abandoned uploads
   * (e.g. client crashed before calling confirmUpload).
   * UPLOAD_SIGNATURE_TTL_SECONDS (10 min) is the natural lower bound.
   */
  async sweepStaleUploads(olderThanMs: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const stale = await this.db.mediaAsset.findMany({
      where: {
        status: 'UPLOADING',
        uploadedAt: { lt: cutoff },
      },
      select: { id: true },
    });
    if (stale.length === 0) return [];
    const ids = stale.map((r) => r.id);
    await this.db.mediaAsset.updateMany({
      where: { id: { in: ids } },
      data: { status: 'FAILED', pendingUploadToken: null },
    });
    return ids;
  }

  /**
   * Batch-fetch assets by ids — used by future analytics and moderation bulk actions.
   */
  async findManyByIds(ids: string[]): Promise<MediaAssetDTO[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.mediaAsset.findMany({
      where: { id: { in: ids } },
      select: assetFullSelect,
    });
    return rows.map(toDTO);
  }
}
