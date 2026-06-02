-- AWAAZ Migration: Phase 3 — Geo Mapping & Authority Assignment
-- PostGIS must be enabled (already present from Phase 2 schema config).

-- ---------------------------------------------------------------------------
-- New enums
-- ---------------------------------------------------------------------------

CREATE TYPE "AssignmentSource" AS ENUM ('AUTO', 'MANUAL', 'UNMATCHED');
CREATE TYPE "ConstituencyType" AS ENUM ('WARD', 'ASSEMBLY', 'PARLIAMENTARY');

-- ---------------------------------------------------------------------------
-- GeoBoundaryVersion
-- Tracks each batch of constituency boundary data imported.
-- One row per import event; only one row has isActive = true at a time.
-- ---------------------------------------------------------------------------

CREATE TABLE "geo_boundary_versions" (
    "id"           TEXT          NOT NULL,
    "version"      TEXT          NOT NULL,
    "description"  TEXT,
    "isActive"     BOOLEAN       NOT NULL DEFAULT false,
    "importedById" TEXT          NOT NULL,
    "importedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geo_boundary_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "geo_boundary_versions_version_key"
    ON "geo_boundary_versions"("version");

ALTER TABLE "geo_boundary_versions"
    ADD CONSTRAINT "geo_boundary_versions_importedById_fkey"
    FOREIGN KEY ("importedById")
    REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Constituency
-- One row per geographic unit (ward / assembly seat / parliamentary seat).
--
-- `geo_json`  — raw GeoJSON (Json column) — returned to frontend as-is
-- `boundary`  — PostGIS geometry(MultiPolygon, 4326) — used only for
--               spatial queries via $queryRaw (ST_Contains, ST_DWithin…)
--
-- Both columns are written together during the geo seed/import script.
-- ---------------------------------------------------------------------------

CREATE TABLE "constituencies" (
    "id"                TEXT             NOT NULL,
    "name"              TEXT             NOT NULL,
    "code"              TEXT             NOT NULL,
    "type"              "ConstituencyType" NOT NULL,
    "geoJson"           JSONB            NOT NULL,
    "boundary"          geometry(MultiPolygon, 4326),
    "boundaryVersionId" TEXT             NOT NULL,
    "isActive"          BOOLEAN          NOT NULL DEFAULT true,
    "createdAt"         TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "constituencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "constituencies_code_key"
    ON "constituencies"("code");

CREATE INDEX "constituencies_isActive_idx"
    ON "constituencies"("isActive");

CREATE INDEX "constituencies_type_isActive_idx"
    ON "constituencies"("type", "isActive");

-- GiST spatial index — enables fast ST_Contains lookups on the polygon column
CREATE INDEX "constituencies_boundary_gist_idx"
    ON "constituencies" USING GIST ("boundary");

ALTER TABLE "constituencies"
    ADD CONSTRAINT "constituencies_boundaryVersionId_fkey"
    FOREIGN KEY ("boundaryVersionId")
    REFERENCES "geo_boundary_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- AuthorityAssignment
-- Time-bound assignment of an MLA/authority to a constituency.
-- History is preserved: old rows get endDate set; a new row is inserted.
-- `isActive` is a denormalised Boolean (always mirrors endDate IS NULL).
-- ---------------------------------------------------------------------------

CREATE TABLE "authority_assignments" (
    "id"             TEXT          NOT NULL,
    "constituencyId" TEXT          NOT NULL,
    "authorityId"    TEXT          NOT NULL,
    "assignedById"   TEXT          NOT NULL,
    "startDate"      TIMESTAMP(3)  NOT NULL,
    "endDate"        TIMESTAMP(3),
    "isActive"       BOOLEAN       NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "authority_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "authority_assignments_constituencyId_isActive_idx"
    ON "authority_assignments"("constituencyId", "isActive");

CREATE INDEX "authority_assignments_authorityId_isActive_idx"
    ON "authority_assignments"("authorityId", "isActive");

CREATE INDEX "authority_assignments_startDate_endDate_idx"
    ON "authority_assignments"("startDate", "endDate");

ALTER TABLE "authority_assignments"
    ADD CONSTRAINT "authority_assignments_constituencyId_fkey"
    FOREIGN KEY ("constituencyId")
    REFERENCES "constituencies"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "authority_assignments"
    ADD CONSTRAINT "authority_assignments_authorityId_fkey"
    FOREIGN KEY ("authorityId")
    REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "authority_assignments"
    ADD CONSTRAINT "authority_assignments_assignedById_fkey"
    FOREIGN KEY ("assignedById")
    REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Complaint — add geo fields (Phase 3 additions)
--
-- constituencyId   FK to constituencies — filled by auto-assignment
-- assignmentSource enum: AUTO | MANUAL | UNMATCHED
-- assignedAt       timestamp — enables Time-to-Assign KPI queries
-- ---------------------------------------------------------------------------

ALTER TABLE "complaints"
    ADD COLUMN "constituencyId"   TEXT,
    ADD COLUMN "assignmentSource" "AssignmentSource",
    ADD COLUMN "assignedAt"       TIMESTAMP(3);

CREATE INDEX "complaints_constituencyId_idx"
    ON "complaints"("constituencyId");

CREATE INDEX "complaints_assignmentSource_idx"
    ON "complaints"("assignmentSource");

ALTER TABLE "complaints"
    ADD CONSTRAINT "complaints_constituencyId_fkey"
    FOREIGN KEY ("constituencyId")
    REFERENCES "constituencies"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
