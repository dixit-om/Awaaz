// ---------------------------------------------------------------------------
// Analytics Domain — App-level types (Phase 5)
//
// All result types carry a `computedAt` timestamp so that the frontend can
// display "last updated X minutes ago" and future Redis cache layers can
// honour TTLs without extra metadata fields.
//
// Numeric rates are expressed as percentages with 2 decimal places (0–100).
// Time durations are expressed in hours as floating-point numbers.
// Null is used (not 0) when a metric cannot be computed — e.g. avgResolution
// when there are no resolved complaints yet. The frontend must handle null.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared input types
// ---------------------------------------------------------------------------

/**
 * Date range + granularity filter accepted by every analytics procedure.
 * Defaults are applied in the validation schema (dateFrom = 30 days ago).
 */
export type DateRangeInput = {
  /** ISO 8601 datetime string — inclusive lower bound */
  dateFrom?: string;
  /** ISO 8601 datetime string — inclusive upper bound */
  dateTo?: string;
  /**
   * Time-series granularity for breakdown charts.
   * Only used by procedures that return a `timeSeries` array.
   */
  granularity?: 'day' | 'week' | 'month';
};

// ---------------------------------------------------------------------------
// 1. Overview — headline numbers (all roles, scoped per role)
// ---------------------------------------------------------------------------

export type OverviewResult = {
  totalComplaints: number;
  openComplaints: number;
  assignedComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  verifiedComplaints: number;
  rejectedComplaints: number;
  /** (resolved + verified) / total × 100 */
  resolutionRate: number;
  /** verified / (resolved + verified) × 100 — null when denominator is 0 */
  verificationRate: number | null;
  /** (resolved + verified + rejected) / total × 100 */
  closureRate: number;
  computedAt: Date;
};

// ---------------------------------------------------------------------------
// 2. Complaint Metrics — status breakdown + time KPIs
// ---------------------------------------------------------------------------

export type ComplaintMetricsResult = {
  submitted: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  verified: number;
  rejected: number;
  total: number;
  /** Mean hours from complaint.createdAt → first RESOLVED history entry */
  avgResolutionTimeHours: number | null;
  /** 50th percentile — more representative than mean for governance KPIs */
  medianResolutionTimeHours: number | null;
  /** 90th percentile — SLA breach indicator */
  p90ResolutionTimeHours: number | null;
  /** Mean hours from complaint.createdAt → complaint.assignedAt */
  avgAssignmentTimeHours: number | null;
  /** Mean hours from RESOLVED history entry → VERIFIED history entry */
  avgVerificationTimeHours: number | null;
  computedAt: Date;
};

// ---------------------------------------------------------------------------
// 3. Category Metrics — distribution + trend
// ---------------------------------------------------------------------------

export type CategoryMetricsItem = {
  categoryId: string;
  categoryName: string;
  slug: string;
  count: number;
  /** count / total × 100, 2 decimal places */
  percentage: number;
};

export type CategoryMetricsResult = {
  items: CategoryMetricsItem[];
  /** Sum of all item counts — equals totalComplaints in the same date window */
  total: number;
  computedAt: Date;
};

// ---------------------------------------------------------------------------
// 4. Constituency Metrics — geographic breakdown
// ---------------------------------------------------------------------------

export type ConstituencyMetricsItem = {
  constituencyId: string;
  constituencyName: string;
  code: string;
  type: string;
  total: number;
  openCount: number;
  resolvedCount: number;
  verifiedCount: number;
  /** (resolved + verified) / total × 100 — null when total is 0 */
  resolutionRate: number | null;
};

export type ConstituencyMetricsResult = {
  items: ConstituencyMetricsItem[];
  computedAt: Date;
};

// ---------------------------------------------------------------------------
// 5. Authority Metrics — MLA / authority performance table
// ---------------------------------------------------------------------------

export type AuthorityMetricsItem = {
  authorityId: string;
  authorityName: string;
  /**
   * Total complaints ever assigned to this authority in the date window.
   * Includes currently open complaints.
   */
  assignedCount: number;
  resolvedCount: number;
  verifiedCount: number;
  /** Resolved by authority but citizen rejected the resolution */
  rejectedCount: number;
  /** Currently open (SUBMITTED | ASSIGNED | IN_PROGRESS) */
  openCount: number;
  /** resolvedCount / assignedCount × 100 — null when assignedCount is 0 */
  resolutionPercentage: number | null;
  /**
   * verifiedCount / (verifiedCount + rejectedCount) × 100
   * Measures citizen satisfaction with resolutions.
   * Null when no verification actions have been taken yet.
   */
  citizenApprovalRate: number | null;
  /** Mean hours from assignment → RESOLVED — null when no resolved complaints */
  avgResolutionTimeHours: number | null;
};

export type AuthorityMetricsResult = {
  items: AuthorityMetricsItem[];
  computedAt: Date;
};

// ---------------------------------------------------------------------------
// 6. Governance Metrics — platform-level KPIs (admin only)
// ---------------------------------------------------------------------------

export type GovernanceMetricsResult = {
  /**
   * VERIFIED / total × 100.
   * The only metric that proves actual on-the-ground improvement.
   * A complaint is not truly resolved until the citizen confirms it.
   */
  verifiedResolutionRate: number;
  /** Platform-wide median resolution time in hours */
  medianResolutionTimeHours: number | null;
  /** Platform-wide P90 resolution time — SLA monitoring */
  p90ResolutionTimeHours: number | null;
  /**
   * AUTO-assigned / total assigned × 100.
   * High value = geo system is working. Low value = many manual overrides needed.
   */
  assignmentEfficiency: number | null;
  /**
   * UNMATCHED / total × 100.
   * Measures gaps in the geo boundary data (areas without polygon coverage).
   */
  unmatchedComplaintRate: number | null;
  /**
   * (VERIFIED + REJECTED) / RESOLVED × 100.
   * Measures how actively citizens are verifying resolutions.
   * Low engagement = citizens either don't trust the system or aren't notified.
   */
  citizenEngagementRate: number | null;
  /** Rolling average complaints created per day over the date window */
  avgComplaintsPerDay: number;
  computedAt: Date;
};

// ---------------------------------------------------------------------------
// Input types (mirrored from validation schemas for use across packages)
// ---------------------------------------------------------------------------

export type GetOverviewInput = DateRangeInput;
export type GetComplaintMetricsInput = DateRangeInput;
export type GetCategoryMetricsInput = DateRangeInput;

export type GetConstituencyMetricsInput = DateRangeInput & {
  /** If provided, returns metrics for this constituency only.
   *  Required for MLA role (the service enforces their constituency). */
  constituencyId?: string;
};

export type GetAuthorityMetricsInput = DateRangeInput & {
  /** If provided, returns metrics for this authority only.
   *  Required for MLA role (the service enforces their own ID). */
  authorityId?: string;
};

export type GetGovernanceMetricsInput = DateRangeInput;
