-- Phase 7: Media Upload & Evidence Management
-- Replaces the Phase 2 complaint_media table with the richer media_assets table.
-- Includes backfill of existing rows so no data is lost.
--
-- Changes:
--   + CREATE ENUM MediaStatus         (UPLOADING | READY | FAILED | DELETED)
--   + CREATE ENUM ModerationStatus    (PENDING | APPROVED | REJECTED)
--   + CREATE ENUM CloudProvider       (CLOUDINARY | S3 | LOCAL)
--   + CREATE TABLE media_assets       (full evidence asset record)
--   + BACKFILL complaint_media → media_assets
--   + DROP TABLE complaint_media
--   + DROP ENUM MediaUploadStatus     (replaced by MediaStatus)
--   + Add back-relation indexes on users for uploaded/moderated/deleted media

-- ---------------------------------------------------------------------------
-- New enums
-- ---------------------------------------------------------------------------

CREATE TYPE "MediaStatus" AS ENUM (
  'UPLOADING',
  'READY',
  'FAILED',
  'DELETED'
);

CREATE TYPE "ModerationStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "CloudProvider" AS ENUM (
  'CLOUDINARY',
  'S3',
  'LOCAL'
);

-- ---------------------------------------------------------------------------
-- media_assets table
-- ---------------------------------------------------------------------------

CREATE TABLE "media_assets" (
  -- Identity
  "id"                  TEXT            NOT NULL,

  -- Ownership (immutable after creation — legal evidence chain)
  "complaintId"         TEXT            NOT NULL,
  "uploadedById"        TEXT            NOT NULL,

  -- File characteristics
  "mediaType"           "MediaType"     NOT NULL,
  "originalFileName"    TEXT            NOT NULL,
  "mimeType"            TEXT            NOT NULL,
  "sizeBytes"           INTEGER         NOT NULL,
  "width"               INTEGER,
  "height"              INTEGER,
  "durationSec"         INTEGER,

  -- Evidence integrity
  -- sha256Hash: hex digest of original file bytes.
  --   • Duplicate detection across complaints (same hash = recycled evidence)
  --   • Tamper detection (hash mismatch = file mutated post-upload)
  --   • Legal chain-of-custody proof for public-interest complaints
  "sha256Hash"          TEXT,
  -- capturedAt: EXIF/metadata timestamp of when the photo/video was TAKEN
  --   (distinct from uploadedAt = when the citizen submitted it).
  --   Enables timeline reconstruction and governance SLA analytics.
  "capturedAt"          TIMESTAMP(3),

  -- Cloud provider fields (immutable after status = READY)
  "cloudProvider"       "CloudProvider" NOT NULL DEFAULT 'CLOUDINARY',
  "publicId"            TEXT            NOT NULL DEFAULT '',
  "secureUrl"           TEXT            NOT NULL DEFAULT '',
  "thumbnailUrl"        TEXT,
  "cdnUrl"              TEXT,

  -- Upload state machine
  "status"              "MediaStatus"      NOT NULL DEFAULT 'UPLOADING',

  -- Moderation
  "moderationStatus"    "ModerationStatus" NOT NULL DEFAULT 'PENDING',
  "moderationNotes"     TEXT,
  "moderatedById"       TEXT,
  "moderatedAt"         TIMESTAMP(3),

  -- Upload session integrity token (server-issued CUID2, single-use)
  "pendingUploadToken"  TEXT,

  -- Display order within a complaint
  "sortOrder"           INTEGER         NOT NULL DEFAULT 0,

  -- Lifecycle timestamps
  "uploadedAt"          TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"           TIMESTAMP(3),
  "deletedById"         TEXT,

  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Foreign key constraints
-- ---------------------------------------------------------------------------

-- Cascade on complaint delete — orphan assets must not outlive complaint
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_complaintId_fkey"
  FOREIGN KEY ("complaintId")
  REFERENCES "complaints"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RESTRICT — prevents accidental user deletion if they have uploaded evidence
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_uploadedById_fkey"
  FOREIGN KEY ("uploadedById")
  REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- SET NULL — moderator account deletion should not invalidate the moderation decision
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_moderatedById_fkey"
  FOREIGN KEY ("moderatedById")
  REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- SET NULL — same rationale for deletion actor
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_deletedById_fkey"
  FOREIGN KEY ("deletedById")
  REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Primary read path: all active/non-deleted media for a complaint
CREATE INDEX "media_assets_complaint_id_status_idx"
  ON "media_assets"("complaintId", "status");

-- Moderation queue: oldest pending items first for admin dashboard
CREATE INDEX "media_assets_moderation_status_uploaded_at_idx"
  ON "media_assets"("moderationStatus", "uploadedAt");

-- Soft-delete filter: find active (not deleted) assets for a complaint
CREATE INDEX "media_assets_complaint_id_deleted_at_idx"
  ON "media_assets"("complaintId", "deletedAt");

-- Ownership / analytics: citizen upload history
CREATE INDEX "media_assets_uploaded_by_id_uploaded_at_idx"
  ON "media_assets"("uploadedById", "uploadedAt");

-- Duplicate / tamper detection via SHA-256 hash
CREATE INDEX "media_assets_sha256_hash_idx"
  ON "media_assets"("sha256Hash");

-- Confirm-flow nonce: single-use token lookup
-- Partial index excludes NULL rows (cleared after confirmation) for efficiency
CREATE UNIQUE INDEX "media_assets_pending_upload_token_key"
  ON "media_assets"("pendingUploadToken")
  WHERE "pendingUploadToken" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Backfill: migrate existing complaint_media rows into media_assets
-- ---------------------------------------------------------------------------
-- Maps Phase 2 fields to the new schema.
-- uploadedById is inferred from the parent complaint's citizenId
-- (the only actor who could have uploaded evidence in Phase 2).
-- MediaUploadStatus → MediaStatus: PENDING→UPLOADING, READY→READY, FAILED→FAILED

INSERT INTO "media_assets" (
  "id",
  "complaintId",
  "uploadedById",
  "mediaType",
  "originalFileName",
  "mimeType",
  "sizeBytes",
  "width",
  "height",
  "durationSec",
  "cloudProvider",
  "publicId",
  "secureUrl",
  "status",
  "sortOrder",
  "uploadedAt"
)
SELECT
  cm."id",
  cm."complaintId",
  c."citizenId"                              AS "uploadedById",
  cm."mediaType",
  cm."mediaUrl"                              AS "originalFileName",
  COALESCE(cm."mimeType", 'application/octet-stream') AS "mimeType",
  COALESCE(cm."fileSize", 0)                AS "sizeBytes",
  cm."width",
  cm."height",
  cm."durationSec",
  'CLOUDINARY'::"CloudProvider"             AS "cloudProvider",
  COALESCE(cm."externalId", '')             AS "publicId",
  cm."mediaUrl"                             AS "secureUrl",
  CASE cm."uploadStatus"
    WHEN 'READY'   THEN 'READY'::"MediaStatus"
    WHEN 'FAILED'  THEN 'FAILED'::"MediaStatus"
    ELSE                'UPLOADING'::"MediaStatus"
  END                                       AS "status",
  cm."sortOrder",
  cm."createdAt"                            AS "uploadedAt"
FROM "complaint_media" cm
JOIN "complaints" c ON c."id" = cm."complaintId";

-- ---------------------------------------------------------------------------
-- Drop old table and enum
-- ---------------------------------------------------------------------------

DROP TABLE "complaint_media";

-- MediaUploadStatus is no longer referenced after dropping complaint_media
DROP TYPE "MediaUploadStatus";
