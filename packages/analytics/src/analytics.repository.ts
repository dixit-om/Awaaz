import type { PrismaClient } from '@awaaz/db';
import { Prisma } from '@prisma/client';
import type {
  OverviewResult,
  ComplaintMetricsResult,
  CategoryMetricsItem,
  ConstituencyMetricsItem,
  AuthorityMetricsItem,
  GovernanceMetricsResult,
} from '@awaaz/types';
import { parseBigInt, parseNumeric, round, safeRate, daysBetween } from './analytics.utils.js';
import { RATE_DECIMAL_PLACES } from './analytics.constants.js';

// ---------------------------------------------------------------------------
// Raw query result shapes
//
// Prisma $queryRaw returns typed arrays when you pass a Prisma.sql template.
// Each interface below exactly mirrors what PostgreSQL returns for that query.
// BigInt is used for COUNT(*); string for numeric aggregates (AVG, PERCENTILE).
// ---------------------------------------------------------------------------

interface StatusBreakdownRow {
  total: bigint;
  submitted: bigint;
  assigned: bigint;
  in_progress: bigint;
  resolved: bigint;
  verified: bigint;
  rejected: bigint;
}

interface TimeMetricsRow {
  avg_resolution_hours: string | null;
  median_resolution_hours: string | null;
  p90_resolution_hours: string | null;
  avg_assignment_hours: string | null;
  avg_verification_hours: string | null;
}

interface CategoryRow {
  category_id: string;
  category_name: string;
  slug: string;
  count: bigint;
}

interface ConstituencyRow {
  constituency_id: string;
  constituency_name: string;
  code: string;
  type: string;
  total: bigint;
  open_count: bigint;
  resolved_count: bigint;
  verified_count: bigint;
}

interface AuthorityRow {
  authority_id: string;
  authority_name: string;
  assigned_count: bigint;
  resolved_count: bigint;
  verified_count: bigint;
  rejected_count: bigint;
  open_count: bigint;
  avg_resolution_hours: string | null;
}

interface GovernanceRow {
  total: bigint;
  verified: bigint;
  resolved_plus_verified: bigint;
  auto_assigned: bigint;
  total_assigned: bigint;
  unmatched: bigint;
  verified_actions: bigint;
  rejected_actions: bigint;
  median_resolution_hours: string | null;
  p90_resolution_hours: string | null;
}

// ---------------------------------------------------------------------------
// Analytics Repository
// ---------------------------------------------------------------------------

export class AnalyticsRepository {
  constructor(private readonly db: PrismaClient) {}

  // =========================================================================
  // 1. Status breakdown — used by getOverview + getComplaintMetrics
  //
  // Single table scan with FILTER aggregates — one pass, no joins.
  // Scope parameter makes the same query work for all three roles:
  //   Admin         → no extra WHERE condition
  //   MLA           → AND constituency_id = $constituencyId
  //   Citizen       → AND citizen_id = $citizenId
  // =========================================================================

  async getStatusBreakdown(
    dateFrom: Date,
    dateTo: Date,
    scope?: { citizenId: string } | { constituencyId: string },
  ): Promise<StatusBreakdownRow> {
    const scopeClause = scope
      ? 'citizenId' in scope
        ? Prisma.sql`AND "citizenId" = ${scope.citizenId}`
        : Prisma.sql`AND "constituencyId" = ${scope.constituencyId}`
      : Prisma.sql``;

    const rows = await this.db.$queryRaw<StatusBreakdownRow[]>`
      SELECT
        COUNT(*)                                                     AS total,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED'::"ComplaintStatus")   AS submitted,
        COUNT(*) FILTER (WHERE status = 'ASSIGNED'::"ComplaintStatus")    AS assigned,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS'::"ComplaintStatus") AS in_progress,
        COUNT(*) FILTER (WHERE status = 'RESOLVED'::"ComplaintStatus")    AS resolved,
        COUNT(*) FILTER (WHERE status = 'VERIFIED'::"ComplaintStatus")    AS verified,
        COUNT(*) FILTER (WHERE status = 'REJECTED'::"ComplaintStatus")    AS rejected
      FROM complaints
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${dateFrom}
        AND "createdAt" <= ${dateTo}
        ${scopeClause}
    `;

    return (
      rows[0] ?? {
        total: 0n,
        submitted: 0n,
        assigned: 0n,
        in_progress: 0n,
        resolved: 0n,
        verified: 0n,
        rejected: 0n,
      }
    );
  }

  // =========================================================================
  // 2. Time metrics — resolution, assignment, verification durations
  //
  // Uses a LATERAL join on complaint_status_history to find the exact
  // timestamp when each status transition occurred.
  //
  // PERCENTILE_CONT is a PostgreSQL ordered-set aggregate — not expressible
  // in Prisma ORM, hence $queryRaw.
  // =========================================================================

  async getTimeMetrics(
    dateFrom: Date,
    dateTo: Date,
    scope?: { citizenId: string } | { constituencyId: string } | { authorityId: string },
  ): Promise<TimeMetricsRow> {
    const scopeClause = scope
      ? 'citizenId' in scope
        ? Prisma.sql`AND c."citizenId" = ${scope.citizenId}`
        : 'constituencyId' in scope
          ? Prisma.sql`AND c."constituencyId" = ${scope.constituencyId}`
          : Prisma.sql`AND c."assignedAuthorityId" = ${(scope as { authorityId: string }).authorityId}`
      : Prisma.sql``;

    const rows = await this.db.$queryRaw<TimeMetricsRow[]>`
      SELECT
        -- Average resolution time: complaint created → first RESOLVED entry
        AVG(
          EXTRACT(EPOCH FROM (r.resolved_at - c."createdAt")) / 3600.0
        )::numeric(10,2)                                          AS avg_resolution_hours,

        -- Median resolution time (P50)
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (r.resolved_at - c."createdAt")) / 3600.0
        )::numeric(10,2)                                          AS median_resolution_hours,

        -- P90 resolution time — SLA breach indicator
        PERCENTILE_CONT(0.9) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (r.resolved_at - c."createdAt")) / 3600.0
        )::numeric(10,2)                                          AS p90_resolution_hours,

        -- Average assignment time: complaint created → assignedAt
        AVG(
          EXTRACT(EPOCH FROM (c."assignedAt" - c."createdAt")) / 3600.0
        )::numeric(10,2)                                          AS avg_assignment_hours,

        -- Average verification time: RESOLVED → VERIFIED
        AVG(
          EXTRACT(EPOCH FROM (v.verified_at - r.resolved_at)) / 3600.0
        )::numeric(10,2)                                          AS avg_verification_hours

      FROM complaints c

      -- LATERAL: find the earliest RESOLVED transition per complaint
      LEFT JOIN LATERAL (
        SELECT MIN("createdAt") AS resolved_at
        FROM complaint_status_history
        WHERE "complaintId" = c.id
          AND "newStatus" = 'RESOLVED'::"ComplaintStatus"
      ) r ON TRUE

      -- LATERAL: find the earliest VERIFIED transition per complaint
      LEFT JOIN LATERAL (
        SELECT MIN("createdAt") AS verified_at
        FROM complaint_status_history
        WHERE "complaintId" = c.id
          AND "newStatus" = 'VERIFIED'::"ComplaintStatus"
      ) v ON TRUE

      WHERE c."deletedAt" IS NULL
        AND c."createdAt" >= ${dateFrom}
        AND c."createdAt" <= ${dateTo}
        AND r.resolved_at IS NOT NULL   -- only compute for resolved complaints
        ${scopeClause}
    `;

    return (
      rows[0] ?? {
        avg_resolution_hours: null,
        median_resolution_hours: null,
        p90_resolution_hours: null,
        avg_assignment_hours: null,
        avg_verification_hours: null,
      }
    );
  }

  // =========================================================================
  // 3. Category metrics
  //
  // Window function SUM(...) OVER () computes percentage in a single pass —
  // no subquery or second scan needed.
  // =========================================================================

  async getCategoryBreakdown(
    dateFrom: Date,
    dateTo: Date,
    scope?: { citizenId: string } | { constituencyId: string },
  ): Promise<CategoryRow[]> {
    const scopeClause = scope
      ? 'citizenId' in scope
        ? Prisma.sql`AND c."citizenId" = ${scope.citizenId}`
        : Prisma.sql`AND c."constituencyId" = ${scope.constituencyId}`
      : Prisma.sql``;

    return this.db.$queryRaw<CategoryRow[]>`
      SELECT
        cc.id                                   AS category_id,
        cc.name                                 AS category_name,
        cc.slug,
        COUNT(c.id)                             AS count
      FROM complaint_categories cc
      LEFT JOIN complaints c
        ON c."categoryId" = cc.id
        AND c."deletedAt" IS NULL
        AND c."createdAt" >= ${dateFrom}
        AND c."createdAt" <= ${dateTo}
        ${scopeClause}
      WHERE cc."isActive" = true
      GROUP BY cc.id, cc.name, cc.slug
      ORDER BY count DESC
    `;
  }

  // =========================================================================
  // 4. Constituency metrics
  //
  // LEFT JOIN ensures constituencies with 0 complaints still appear.
  // NULLIF prevents division-by-zero in resolution rate.
  // =========================================================================

  async getConstituencyBreakdown(
    dateFrom: Date,
    dateTo: Date,
    constituencyId?: string,
  ): Promise<ConstituencyRow[]> {
    const constituencyFilter = constituencyId
      ? Prisma.sql`AND con.id = ${constituencyId}`
      : Prisma.sql``;

    return this.db.$queryRaw<ConstituencyRow[]>`
      SELECT
        con.id                                                          AS constituency_id,
        con.name                                                        AS constituency_name,
        con.code,
        con.type::text,
        COUNT(c.id)                                                     AS total,
        COUNT(c.id) FILTER (
          WHERE c.status IN (
            'SUBMITTED'::"ComplaintStatus",
            'ASSIGNED'::"ComplaintStatus",
            'IN_PROGRESS'::"ComplaintStatus"
          )
        )                                                               AS open_count,
        COUNT(c.id) FILTER (
          WHERE c.status IN (
            'RESOLVED'::"ComplaintStatus",
            'VERIFIED'::"ComplaintStatus"
          )
        )                                                               AS resolved_count,
        COUNT(c.id) FILTER (
          WHERE c.status = 'VERIFIED'::"ComplaintStatus"
        )                                                               AS verified_count
      FROM constituencies con
      LEFT JOIN complaints c
        ON c."constituencyId" = con.id
        AND c."deletedAt" IS NULL
        AND c."createdAt" >= ${dateFrom}
        AND c."createdAt" <= ${dateTo}
      WHERE con."isActive" = true
        ${constituencyFilter}
      GROUP BY con.id, con.name, con.code, con.type
      ORDER BY total DESC
    `;
  }

  // =========================================================================
  // 5. Authority metrics
  //
  // Joins complaints → users (MLA role only) and LATERAL joins for
  // resolution time. One query returns the full leaderboard.
  // =========================================================================

  async getAuthorityBreakdown(
    dateFrom: Date,
    dateTo: Date,
    authorityId?: string,
  ): Promise<AuthorityRow[]> {
    const authorityFilter = authorityId ? Prisma.sql`AND u.id = ${authorityId}` : Prisma.sql``;

    return this.db.$queryRaw<AuthorityRow[]>`
      SELECT
        u.id                                                             AS authority_id,
        COALESCE(u.name, u."phoneNumber")                               AS authority_name,
        COUNT(c.id)                                                      AS assigned_count,
        COUNT(c.id) FILTER (
          WHERE c.status IN (
            'RESOLVED'::"ComplaintStatus",
            'VERIFIED'::"ComplaintStatus"
          )
        )                                                                AS resolved_count,
        COUNT(c.id) FILTER (
          WHERE c.status = 'VERIFIED'::"ComplaintStatus"
        )                                                                AS verified_count,
        COUNT(c.id) FILTER (
          WHERE c.status = 'REJECTED'::"ComplaintStatus"
        )                                                                AS rejected_count,
        COUNT(c.id) FILTER (
          WHERE c.status IN (
            'SUBMITTED'::"ComplaintStatus",
            'ASSIGNED'::"ComplaintStatus",
            'IN_PROGRESS'::"ComplaintStatus"
          )
        )                                                                AS open_count,
        AVG(
          EXTRACT(EPOCH FROM (r.resolved_at - c."createdAt")) / 3600.0
        )::numeric(10,2)                                                AS avg_resolution_hours
      FROM users u
      JOIN complaints c
        ON c."assignedAuthorityId" = u.id
        AND c."deletedAt" IS NULL
        AND c."createdAt" >= ${dateFrom}
        AND c."createdAt" <= ${dateTo}
      LEFT JOIN LATERAL (
        SELECT MIN("createdAt") AS resolved_at
        FROM complaint_status_history
        WHERE "complaintId" = c.id
          AND "newStatus" = 'RESOLVED'::"ComplaintStatus"
      ) r ON TRUE
      WHERE u.role = 'MLA'::"UserRole"
        ${authorityFilter}
      GROUP BY u.id, u.name, u."phoneNumber"
      ORDER BY resolved_count DESC, assigned_count DESC
    `;
  }

  // =========================================================================
  // 6. Governance metrics — platform-level KPIs (admin only)
  //
  // Two queries:
  //   A) Count aggregates for rates (single scan)
  //   B) Time percentiles (separate scan — can't mix FILTER and WITHIN GROUP
  //      aggregates in the same SELECT without a subquery)
  // =========================================================================

  async getGovernanceCounts(dateFrom: Date, dateTo: Date): Promise<GovernanceRow> {
    const rows = await this.db.$queryRaw<GovernanceRow[]>`
      SELECT
        COUNT(*)                                                           AS total,
        COUNT(*) FILTER (
          WHERE status = 'VERIFIED'::"ComplaintStatus"
        )                                                                  AS verified,
        COUNT(*) FILTER (
          WHERE status IN (
            'RESOLVED'::"ComplaintStatus",
            'VERIFIED'::"ComplaintStatus"
          )
        )                                                                  AS resolved_plus_verified,
        COUNT(*) FILTER (
          WHERE "assignmentSource" = 'AUTO'::"AssignmentSource"
        )                                                                  AS auto_assigned,
        COUNT(*) FILTER (
          WHERE "assignmentSource" IS NOT NULL
            AND "assignmentSource" != 'UNMATCHED'::"AssignmentSource"
        )                                                                  AS total_assigned,
        COUNT(*) FILTER (
          WHERE "assignmentSource" = 'UNMATCHED'::"AssignmentSource"
        )                                                                  AS unmatched,
        -- Citizen engagement: complaints where citizen took a verification action
        COUNT(*) FILTER (
          WHERE status = 'VERIFIED'::"ComplaintStatus"
        )                                                                  AS verified_actions,
        COUNT(*) FILTER (
          WHERE status = 'REJECTED'::"ComplaintStatus"
        )                                                                  AS rejected_actions,
        -- Resolution time percentiles (from status history via subquery)
        (
          SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (r.resolved_at - c2."createdAt")) / 3600.0
          )::numeric(10,2)
          FROM complaints c2
          JOIN LATERAL (
            SELECT MIN("createdAt") AS resolved_at
            FROM complaint_status_history
            WHERE "complaintId" = c2.id
              AND "newStatus" = 'RESOLVED'::"ComplaintStatus"
          ) r ON r.resolved_at IS NOT NULL
          WHERE c2."deletedAt" IS NULL
            AND c2."createdAt" >= ${dateFrom}
            AND c2."createdAt" <= ${dateTo}
        )                                                                  AS median_resolution_hours,
        (
          SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (r.resolved_at - c2."createdAt")) / 3600.0
          )::numeric(10,2)
          FROM complaints c2
          JOIN LATERAL (
            SELECT MIN("createdAt") AS resolved_at
            FROM complaint_status_history
            WHERE "complaintId" = c2.id
              AND "newStatus" = 'RESOLVED'::"ComplaintStatus"
          ) r ON r.resolved_at IS NOT NULL
          WHERE c2."deletedAt" IS NULL
            AND c2."createdAt" >= ${dateFrom}
            AND c2."createdAt" <= ${dateTo}
        )                                                                  AS p90_resolution_hours
      FROM complaints
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${dateFrom}
        AND "createdAt" <= ${dateTo}
    `;

    return (
      rows[0] ?? {
        total: 0n,
        verified: 0n,
        resolved_plus_verified: 0n,
        auto_assigned: 0n,
        total_assigned: 0n,
        unmatched: 0n,
        verified_actions: 0n,
        rejected_actions: 0n,
        median_resolution_hours: null,
        p90_resolution_hours: null,
      }
    );
  }

  // =========================================================================
  // MLA constituency lookup — used by service for scope resolution
  // =========================================================================

  async findMlaActiveConstituencyId(mlaId: string): Promise<string | undefined> {
    const row = await this.db.authorityAssignment.findFirst({
      where: { authorityId: mlaId, isActive: true },
      select: { constituencyId: true },
      orderBy: { startDate: 'desc' },
    });
    return row?.constituencyId ?? undefined;
  }

  // =========================================================================
  // Mapping helpers — convert raw DB rows to typed result objects
  // =========================================================================

  mapToOverview(breakdown: StatusBreakdownRow, computedAt: Date): OverviewResult {
    const total = parseBigInt(breakdown.total);
    const resolved = parseBigInt(breakdown.resolved);
    const verified = parseBigInt(breakdown.verified);
    const rejected = parseBigInt(breakdown.rejected);
    const open =
      parseBigInt(breakdown.submitted) +
      parseBigInt(breakdown.assigned) +
      parseBigInt(breakdown.in_progress);
    const assigned = parseBigInt(breakdown.assigned);
    const inProgress = parseBigInt(breakdown.in_progress);

    const resolvedPlusVerified = resolved + verified;

    return {
      totalComplaints: total,
      openComplaints: open,
      assignedComplaints: assigned,
      inProgressComplaints: inProgress,
      resolvedComplaints: resolved,
      verifiedComplaints: verified,
      rejectedComplaints: rejected,
      resolutionRate: safeRate(resolvedPlusVerified, total) ?? 0,
      verificationRate: safeRate(verified, resolvedPlusVerified),
      closureRate: safeRate(resolvedPlusVerified + rejected, total) ?? 0,
      computedAt,
    };
  }

  mapToComplaintMetrics(
    breakdown: StatusBreakdownRow,
    time: TimeMetricsRow,
    computedAt: Date,
  ): ComplaintMetricsResult {
    return {
      total: parseBigInt(breakdown.total),
      submitted: parseBigInt(breakdown.submitted),
      assigned: parseBigInt(breakdown.assigned),
      inProgress: parseBigInt(breakdown.in_progress),
      resolved: parseBigInt(breakdown.resolved),
      verified: parseBigInt(breakdown.verified),
      rejected: parseBigInt(breakdown.rejected),
      avgResolutionTimeHours: parseNumeric(time.avg_resolution_hours),
      medianResolutionTimeHours: parseNumeric(time.median_resolution_hours),
      p90ResolutionTimeHours: parseNumeric(time.p90_resolution_hours),
      avgAssignmentTimeHours: parseNumeric(time.avg_assignment_hours),
      avgVerificationTimeHours: parseNumeric(time.avg_verification_hours),
      computedAt,
    };
  }

  mapToCategoryMetrics(
    rows: CategoryRow[],
    computedAt: Date,
  ): { items: CategoryMetricsItem[]; total: number; computedAt: Date } {
    const total = rows.reduce((sum, r) => sum + parseBigInt(r.count), 0);
    const items: CategoryMetricsItem[] = rows.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      slug: r.slug,
      count: parseBigInt(r.count),
      percentage: round(total > 0 ? (parseBigInt(r.count) / total) * 100 : 0, RATE_DECIMAL_PLACES),
    }));
    return { items, total, computedAt };
  }

  mapToConstituencyMetrics(
    rows: ConstituencyRow[],
    computedAt: Date,
  ): { items: ConstituencyMetricsItem[]; computedAt: Date } {
    const items: ConstituencyMetricsItem[] = rows.map((r) => {
      const total = parseBigInt(r.total);
      const resolved = parseBigInt(r.resolved_count);
      const verified = parseBigInt(r.verified_count);
      return {
        constituencyId: r.constituency_id,
        constituencyName: r.constituency_name,
        code: r.code,
        type: r.type,
        total,
        openCount: parseBigInt(r.open_count),
        resolvedCount: resolved,
        verifiedCount: verified,
        resolutionRate: safeRate(resolved + verified, total),
      };
    });
    return { items, computedAt };
  }

  mapToAuthorityMetrics(
    rows: AuthorityRow[],
    computedAt: Date,
  ): { items: AuthorityMetricsItem[]; computedAt: Date } {
    const items: AuthorityMetricsItem[] = rows.map((r) => {
      const assigned = parseBigInt(r.assigned_count);
      const resolved = parseBigInt(r.resolved_count);
      const verified = parseBigInt(r.verified_count);
      const rejected = parseBigInt(r.rejected_count);
      return {
        authorityId: r.authority_id,
        authorityName: r.authority_name,
        assignedCount: assigned,
        resolvedCount: resolved,
        verifiedCount: verified,
        rejectedCount: rejected,
        openCount: parseBigInt(r.open_count),
        resolutionPercentage: safeRate(resolved, assigned),
        citizenApprovalRate: safeRate(verified, verified + rejected),
        avgResolutionTimeHours: parseNumeric(r.avg_resolution_hours),
      };
    });
    return { items, computedAt };
  }

  mapToGovernanceMetrics(
    row: GovernanceRow,
    dateFrom: Date,
    dateTo: Date,
    computedAt: Date,
  ): GovernanceMetricsResult {
    const total = parseBigInt(row.total);
    const verified = parseBigInt(row.verified);
    const resolvedPlusVerified = parseBigInt(row.resolved_plus_verified);
    const autoAssigned = parseBigInt(row.auto_assigned);
    const totalAssigned = parseBigInt(row.total_assigned);
    const unmatched = parseBigInt(row.unmatched);
    const verifiedActions = parseBigInt(row.verified_actions);
    const rejectedActions = parseBigInt(row.rejected_actions);

    const days = daysBetween(dateFrom, dateTo);

    return {
      verifiedResolutionRate: safeRate(verified, total) ?? 0,
      medianResolutionTimeHours: parseNumeric(row.median_resolution_hours),
      p90ResolutionTimeHours: parseNumeric(row.p90_resolution_hours),
      assignmentEfficiency: safeRate(autoAssigned, totalAssigned),
      unmatchedComplaintRate: safeRate(unmatched, total),
      citizenEngagementRate: safeRate(verifiedActions + rejectedActions, resolvedPlusVerified),
      avgComplaintsPerDay: round(total / days, RATE_DECIMAL_PLACES),
      computedAt,
    };
  }
}
