-- AWAAZ Migration: Phase 5 — Analytics & Governance Reporting
-- Adds composite indexes to support efficient analytics aggregation queries.
--
-- Strategy:
--   All analytics queries share three common WHERE predicates:
--     1. deleted_at IS NULL          — soft-delete filter
--     2. created_at BETWEEN x AND y  — date range filter
--     3. scope column (status, constituency_id, assigned_authority_id, etc.)
--
--   Composite indexes are ordered: scope column → deleted_at → created_at
--   so that the planner can use the index for both equality and range scans
--   in a single index seek.
--
--   The existing single-column indexes on complaints (status, categoryId,
--   constituencyId, assignedAuthorityId, createdAt) will NOT be dropped —
--   they continue to serve the operational (CRUD) query paths.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- complaints — analytics composite indexes
-- ---------------------------------------------------------------------------

-- Overview / governance metrics: full status breakdown in a date window
-- Used by: getOverview, getComplaintMetrics, getGovernanceMetrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "complaints_analytics_status_date_idx"
    ON "complaints" ("status", "deletedAt", "createdAt");

-- Authority performance: all complaints assigned to an authority in a window
-- Used by: getAuthorityMetrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "complaints_analytics_authority_status_date_idx"
    ON "complaints" ("assignedAuthorityId", "status", "deletedAt", "createdAt");

-- Constituency breakdown: all complaints in a constituency in a window
-- Used by: getConstituencyMetrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "complaints_analytics_constituency_status_date_idx"
    ON "complaints" ("constituencyId", "status", "deletedAt", "createdAt");

-- Assignment source analytics: AUTO vs MANUAL vs UNMATCHED efficiency
-- Used by: getGovernanceMetrics (assignmentEfficiency, unmatchedComplaintRate)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "complaints_analytics_assignment_source_date_idx"
    ON "complaints" ("assignmentSource", "deletedAt", "createdAt");

-- Citizen-scoped overview: citizen sees only their own stats
-- Used by: getOverview (CITIZEN role)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "complaints_analytics_citizen_status_date_idx"
    ON "complaints" ("citizenId", "status", "deletedAt", "createdAt");

-- ---------------------------------------------------------------------------
-- complaint_status_history — resolution-time analytics index
-- ---------------------------------------------------------------------------
-- The LATERAL join that computes resolution/verification time does:
--   SELECT MIN(created_at)
--   FROM complaint_status_history
--   WHERE complaint_id = $id
--     AND new_status IN ('RESOLVED', 'VERIFIED')
--
-- The existing (complaintId, createdAt) index covers the complaint_id lookup
-- but cannot filter on new_status without a full index scan on each row.
-- This composite index adds new_status so the planner can use an index-only
-- scan for the LATERAL join.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "csh_analytics_complaint_status_date_idx"
    ON "complaint_status_history" ("complaintId", "newStatus", "createdAt");

-- ---------------------------------------------------------------------------
-- authority_assignments — active authority lookup for constituency metrics
-- ---------------------------------------------------------------------------
-- Used when joining constituency → active MLA for the authority metrics view.
-- The existing (constituencyId, isActive) index already covers this but
-- adding startDate enables efficient time-bound assignment range queries.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "authority_assignments_analytics_constituency_active_idx"
    ON "authority_assignments" ("constituencyId", "isActive", "startDate");
