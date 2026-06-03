/**
 * Phase 7 — Media Upload & Evidence Management
 *
 * Type hierarchy:
 *   Enums              — app-level mirrors of Prisma enums (decoupled from @prisma/client)
 *   DTOs               — shapes returned to API callers
 *   Input types        — shapes accepted by tRPC procedures
 *   Result types       — shapes returned by tRPC procedures
 *   Adapter interfaces — CloudProviderAdapter, ModerationAdapter (Strategy pattern)
 *
 * Evidence-integrity invariants (enforced in service layer, documented here):
 *   • complaintId, uploadedById, mediaType, uploadedAt are IMMUTABLE after creation.
 *   • publicId, secureUrl, sha256Hash are IMMUTABLE after status = READY.
 *   • Deletion is always SOFT — deletedAt / deletedById set; record never removed.
 */

// ---------------------------------------------------------------------------
// Enums (app-level — decoupled from @prisma/client)
// ---------------------------------------------------------------------------

/** Upload lifecycle state for a MediaAsset row. */
export type MediaStatus = 'UPLOADING' | 'READY' | 'FAILED' | 'DELETED';

/** Content moderation state. Controls public URL visibility. */
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Cloud storage back-end hosting the asset.
 * The service layer speaks to a `CloudProviderAdapter`; this enum is stored
 * on the DB row to support multi-provider queries and future migrations.
 */
export type CloudProvider = 'CLOUDINARY' | 'S3' | 'LOCAL';

// ---------------------------------------------------------------------------
// DTOs — shapes returned to API callers
// ---------------------------------------------------------------------------

/**
 * Full MediaAsset DTO — returned to the asset's owner and admins.
 * Contains all metadata including moderation details and evidence fields.
 */
export type MediaAssetDTO = {
  id: string;
  complaintId: string;
  uploadedById: string;

  // File characteristics
  mediaType: 'IMAGE' | 'VIDEO';
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  /** Video length in seconds; null for images. */
  durationSec: number | null;

  // Evidence integrity
  /**
   * SHA-256 hex digest of the original file bytes.
   * Null for legacy rows and uploads that failed before confirmation.
   * Clients should compute and supply this during confirmUpload.
   */
  sha256Hash: string | null;
  /**
   * EXIF/metadata capture timestamp — when the photo/video was TAKEN.
   * Distinct from uploadedAt (when the citizen submitted the file).
   * Enables timeline reconstruction and detection of backdated evidence.
   */
  capturedAt: Date | null;

  // Cloud provider
  cloudProvider: CloudProvider;
  /** Provider-assigned asset identifier. Immutable after status = READY. */
  publicId: string;
  /** Primary HTTPS delivery URL. */
  secureUrl: string;
  /** Thumbnail URL (Cloudinary eager transform or equivalent). */
  thumbnailUrl: string | null;
  /** CDN-rewritten URL — populated post-MVP for provider migrations. */
  cdnUrl: string | null;

  // State
  status: MediaStatus;

  // Moderation
  moderationStatus: ModerationStatus;
  /** Human-readable notes from the reviewing admin. */
  moderationNotes: string | null;
  moderatedById: string | null;
  moderatedAt: Date | null;

  // Display
  sortOrder: number;

  // Lifecycle timestamps
  uploadedAt: Date;
  deletedAt: Date | null;
  deletedById: string | null;
};

/**
 * Public-safe MediaAsset DTO — returned to non-owner viewers (MLAs, public portal).
 * Excludes: uploadedById, sha256Hash (privacy), moderation admin fields,
 * pendingUploadToken housekeeping, and deleted-by identity.
 *
 * Only assets with status = READY and moderationStatus = APPROVED are served
 * via this shape. The service layer enforces this before mapping.
 */
export type MediaAssetPublicDTO = {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  secureUrl: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  /** Capture timestamp — public timeline information, not personally identifying. */
  capturedAt: Date | null;
  sortOrder: number;
  uploadedAt: Date;
};

/**
 * Compact embed used inside `ComplaintDetail.media`.
 * Carries just enough information for the complaint view to render evidence.
 */
export type MediaAssetEmbed = {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  secureUrl: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  status: MediaStatus;
  moderationStatus: ModerationStatus;
  sortOrder: number;
  uploadedAt: Date;
};

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Input for `media.createUploadRequest`.
 * The server uses this to validate the intended upload BEFORE issuing
 * signed credentials to the cloud provider.
 */
export type CreateUploadRequestInput = {
  complaintId: string;
  mediaType: 'IMAGE' | 'VIDEO';
  /** Original filename from the device — display only, not used for routing. */
  fileName: string;
  /**
   * MIME type declared by the client.
   * Validated server-side against the whitelist; the cloud upload preset
   * enforces the same restriction at the provider level (defence in depth).
   */
  mimeType: string;
  /** Declared file size in bytes — validated against the per-type size limit. */
  sizeBytes: number;
  /**
   * Optional: SHA-256 hash pre-computed by the client before uploading.
   * If supplied at request time, the server can detect duplicate uploads
   * (same hash already exists for this complaint) before issuing credentials.
   * If omitted here, it must be supplied in confirmUpload.
   */
  sha256HashEarly?: string;
};

/**
 * Input for `media.confirmUpload`.
 * Sent by the client after the direct upload to the cloud provider succeeds.
 * The server verifies the token, populates metadata, and flips status → READY.
 */
export type ConfirmUploadInput = {
  /** The MediaAsset id returned by createUploadRequest. */
  mediaAssetId: string;
  /**
   * Provider-assigned public_id returned by the cloud upload response.
   * Must match the `pendingUploadToken`-derived value issued by the server —
   * prevents an attacker from substituting a foreign asset.
   */
  publicId: string;
  /** HTTPS delivery URL returned by the cloud upload response. */
  secureUrl: string;
  /**
   * SHA-256 hex digest of the uploaded file bytes.
   * Required if not supplied in createUploadRequest.
   * Stored immutably for tamper detection and duplicate identification.
   */
  sha256Hash?: string;
  /**
   * EXIF capture timestamp extracted by the client from the file metadata.
   * If the device/OS strips EXIF, this field is omitted.
   */
  capturedAt?: Date;
  /** Provider-returned technical metadata from the upload response. */
  metadata: {
    width?: number;
    height?: number;
    /** Video duration in seconds. */
    durationSec?: number;
    /** Thumbnail URL from eager transform (Cloudinary) or equivalent. */
    thumbnailUrl?: string;
    /** Actual bytes confirmed by provider (may differ from declared sizeBytes). */
    sizeBytes?: number;
  };
};

/** Input for `media.getMediaByComplaint`. */
export type GetMediaByComplaintInput = {
  complaintId: string;
};

/** Input for `media.deleteMedia`. */
export type DeleteMediaInput = {
  mediaAssetId: string;
};

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * Returned by `media.createUploadRequest`.
 * Contains all signed parameters the client needs for a direct upload to
 * the cloud provider — the server's private API secret is NEVER included.
 */
export type CreateUploadRequestResult = {
  /** The newly created MediaAsset id — needed for confirmUpload. */
  mediaAssetId: string;
  /** Provider upload endpoint URL. */
  uploadUrl: string;
  /** Public API key (not secret). */
  apiKey: string;
  /** HMAC-SHA1 signature of the upload params — time-limited. */
  signature: string;
  /** Unix timestamp used in the signature (seconds since epoch). */
  timestamp: number;
  /**
   * Server-assigned public_id for this upload.
   * The client MUST use exactly this publicId when uploading to the provider.
   * confirmUpload verifies it matches the server-issued value.
   */
  publicId: string;
  /** Cloudinary folder path (or S3 key prefix) for the asset. */
  folder: string;
  /** Cloud provider this signature is valid for. */
  cloudProvider: CloudProvider;
};

/** Returned by `media.confirmUpload`. */
export type ConfirmUploadResult = {
  asset: MediaAssetDTO;
};

/** Returned by `media.getMediaByComplaint`. */
export type GetMediaByComplaintResult = {
  /**
   * Full DTOs if the caller is the uploading citizen or an admin.
   * Public DTOs if the caller is an MLA or unauthenticated (future portal).
   * Only READY + APPROVED assets are included for non-owner callers.
   */
  assets: MediaAssetDTO[] | MediaAssetPublicDTO[];
  total: number;
};

/** Returned by `media.deleteMedia`. */
export type DeleteMediaResult = {
  success: true;
  assetId: string;
};

// ---------------------------------------------------------------------------
// Cloud Provider Adapter interface
// ---------------------------------------------------------------------------

/**
 * Parameters returned by the adapter after generating upload credentials.
 * Shape mirrors Cloudinary's signed upload response; S3 adapters use
 * presigned-URL fields and can leave unused fields empty.
 */
export type CloudProviderUploadParams = {
  uploadUrl: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  publicId: string;
  folder: string;
  cloudProvider: CloudProvider;
  /** Adapter-specific extra params (e.g. Cloudinary upload_preset). */
  extra?: Record<string, string | number | boolean>;
};

/**
 * Technical metadata about an asset already stored by the provider.
 * Returned by verifyUpload() for server-side confirmation after direct upload.
 */
export type CloudAssetMetadata = {
  publicId: string;
  secureUrl: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  sizeBytes: number;
  format: string;
  resourceType: 'image' | 'video' | 'raw';
};

/** Options passed to the adapter when generating upload credentials. */
export type GenerateUploadParamsOptions = {
  /** Intended folder/key-prefix in the provider's storage hierarchy. */
  folder: string;
  mediaType: 'IMAGE' | 'VIDEO';
  /** Max bytes the provider should accept (enforced at provider level). */
  maxBytes: number;
  /** Allowed file formats as provider-native strings (e.g. 'jpg,png,webp'). */
  allowedFormats: string;
  /**
   * Eager transformations to apply server-side after upload
   * (Cloudinary format; ignored by S3 adapter).
   */
  eagerTransformations?: string;
  /** Webhook URL for async eager-transform completion events. */
  notificationUrl?: string;
};

/**
 * CloudProviderAdapter — Strategy interface for cloud storage back-ends.
 *
 * Implementations:
 *   CloudinaryAdapter  — Phase 7 MVP
 *   S3Adapter          — future (sovereignty / scale migration)
 *   LocalAdapter       — test environments only
 *
 * The media.service.ts depends on this interface, never on the concrete class.
 * Swapping providers = injecting a different adapter at app startup.
 */
export interface CloudProviderAdapter {
  readonly provider: CloudProvider;

  /**
   * Generate time-limited, signed upload credentials.
   * The client sends the file directly to the provider using these params —
   * the server is never in the file data path.
   */
  generateUploadParams(
    publicId: string,
    options: GenerateUploadParamsOptions,
  ): Promise<CloudProviderUploadParams>;

  /**
   * Fetch asset metadata from the provider to verify a direct upload succeeded.
   * Called optionally during confirmUpload as an extra integrity check.
   * `mediaType` is provided as a hint since Cloudinary namespaces image/video separately.
   */
  verifyUpload(publicId: string, mediaType?: 'IMAGE' | 'VIDEO'): Promise<CloudAssetMetadata>;

  /**
   * Block public access to an asset (soft-delete at provider level).
   * Called when a MediaAsset is soft-deleted or moderation rejects it.
   * The asset bytes are retained — only the delivery URL is blocked.
   * `mediaType` is required since Cloudinary namespaces image/video separately.
   */
  revokeAccess(publicId: string, mediaType: 'IMAGE' | 'VIDEO'): Promise<void>;

  /**
   * Permanently delete an asset's bytes from cloud storage.
   * Only called by the scheduled retention-policy job AFTER the retention
   * period has elapsed. NEVER called during normal complaint lifecycle.
   * `mediaType` is required since Cloudinary namespaces image/video separately.
   */
  deleteAsset(publicId: string, mediaType: 'IMAGE' | 'VIDEO'): Promise<void>;
}

// ---------------------------------------------------------------------------
// Moderation Adapter interface
// ---------------------------------------------------------------------------

/** Input to a moderation check. */
export type ModerationRequest = {
  assetId: string;
  publicId: string;
  mediaType: 'IMAGE' | 'VIDEO';
  /** Accessible URL for the AI/human reviewer to fetch the content. */
  secureUrl: string;
};

/** Decision returned by any ModerationAdapter. */
export type ModerationResult = {
  status: ModerationStatus;
  /** Human or AI-generated reason for approval / rejection. */
  notes?: string;
  /** Confidence score 0.0–1.0 for AI moderators; null for human. */
  confidence?: number;
};

/**
 * ModerationAdapter — Strategy interface for content moderation back-ends.
 *
 * Implementations:
 *   ManualModerationAdapter   — MVP: places asset in admin review queue
 *   CloudinaryAIAdapter       — Cloudinary moderation add-on
 *   RekognitionAdapter        — AWS Rekognition (NSFW, violence, faces)
 *
 * Future capabilities wired through the same interface:
 *   • Face detection + blur
 *   • Number plate detection + blur
 *   • NSFW / violence classification
 *   • Duplicate / perceptual hash detection
 *
 * Adding a new AI provider = writing a new adapter class.
 * media.service.ts is never modified when the moderation strategy changes.
 */
export interface ModerationAdapter {
  /** Enqueue or synchronously evaluate a moderation request. */
  moderate(request: ModerationRequest): Promise<ModerationResult>;
}
