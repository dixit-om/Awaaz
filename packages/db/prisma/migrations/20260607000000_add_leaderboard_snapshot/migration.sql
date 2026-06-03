-- AWAAZ Migration: Phase 6 — Leaderboard Engine
-- Adds the LeaderboardSnapshot table for pre-computed authority and
-- constituency rankings.
--
-- Design rationale:
--   Snapshots are append-only and never mutated after isPublished = true.
--   This guarantees audit integrity — historical ranks are immutable.
--
--   entityType is VARCHAR (not an enum) so future entity types (DISTRICT,
--   STATE) can be added without a schema migration.
--
--   The metrics column is JSONB to store the full score component breakdown
--   for transparency and debugging without requiring extra tables.
--
--   isPublished is flipped atomically for an entire generation batch so
--   users never see a partially-computed leaderboard.
-- ---------------------------------------------------------------------------

CREATE TABLE "leaderboard_snapshots" (
    "id"              TEXT          NOT NULL,
    "entityType"      TEXT          NOT NULL,
    "entityId"        TEXT          NOT NULL,
    "entityName"      TEXT          NOT NULL,
    "score"           DOUBLE PRECISION NOT NULL,
    "rank"            INTEGER       NOT NULL,
    -- Full score breakdown: verifiedRate, approvalRate, timeScore, etc.
    "metrics"         JSONB         NOT NULL,
    "scoreVersion"    TEXT          NOT NULL DEFAULT 'v1',
    "periodType"      TEXT          NOT NULL,
    "periodStart"     TIMESTAMP(3)  NOT NULL,
    "periodEnd"       TIMESTAMP(3)  NOT NULL,
    "generationBatch" TEXT          NOT NULL,
    "isPublished"     BOOLEAN       NOT NULL DEFAULT false,
    "generatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Primary read path: fetch the published leaderboard for a given entity type
-- and period, ordered by rank ascending.
-- Covers: getAuthorities, getConstituencies, getTopPerformers queries.
CREATE INDEX "leaderboard_snapshots_entityType_periodType_periodStart_isPublished_idx"
    ON "leaderboard_snapshots" ("entityType", "periodType", "periodStart", "isPublished");

-- Rank history for a single entity across all periods.
-- Covers: getAuthorityDetails, getConstituencyDetails trend queries.
CREATE INDEX "leaderboard_snapshots_entityId_entityType_periodType_idx"
    ON "leaderboard_snapshots" ("entityId", "entityType", "periodType");

-- Batch publication: UPDATE ... WHERE generationBatch = $id AND isPublished = false
CREATE INDEX "leaderboard_snapshots_generationBatch_idx"
    ON "leaderboard_snapshots" ("generationBatch");
