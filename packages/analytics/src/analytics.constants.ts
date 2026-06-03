// ---------------------------------------------------------------------------
// Analytics Domain — Constants (Phase 5)
// Pure constants and lookup tables. No imports, no side effects.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const ANALYTICS_ERROR = {
  FORBIDDEN: 'ANALYTICS_FORBIDDEN',
  INVALID_DATE_RANGE: 'ANALYTICS_INVALID_DATE_RANGE',
  CONSTITUENCY_NOT_FOUND: 'ANALYTICS_CONSTITUENCY_NOT_FOUND',
  AUTHORITY_NOT_FOUND: 'ANALYTICS_AUTHORITY_NOT_FOUND',
  /**
   * Returned when a CITIZEN requests a procedure that is only available
   * to MLA or ADMIN roles.
   */
  CITIZEN_SCOPE_EXCEEDED: 'ANALYTICS_CITIZEN_SCOPE_EXCEEDED',
} as const;

export type AnalyticsErrorCode = (typeof ANALYTICS_ERROR)[keyof typeof ANALYTICS_ERROR];

// ---------------------------------------------------------------------------
// Date range defaults
// ---------------------------------------------------------------------------

/** Default look-back window in days when dateFrom is not provided. */
export const DEFAULT_DATE_RANGE_DAYS = 30;

/**
 * Maximum allowed date range span in days.
 * Prevents single queries from scanning the entire complaints table with
 * no upper bound (e.g. an accidental `dateFrom=2000-01-01`).
 * Admins generating all-time reports should use materialized view snapshots
 * (Phase 7) rather than live aggregation queries.
 */
export const MAX_DATE_RANGE_DAYS = 365;

// ---------------------------------------------------------------------------
// Resolution SLA thresholds (hours)
//
// These align with the ASSIGNMENT_SLA_HOURS values already defined in
// @awaaz/geo/geo.constants.ts for consistency.
//
// Used by: getAuthorityMetrics (overdueCount) and governance scorecards.
// ---------------------------------------------------------------------------

export const RESOLUTION_SLA_HOURS: Record<string, number> = {
  LOW: 168, // 7 days
  MEDIUM: 72, // 3 days
  HIGH: 24, // 1 day
  URGENT: 6, // 6 hours
};

/** Default SLA when priority is unknown — falls back to MEDIUM. */
export const DEFAULT_RESOLUTION_SLA_HOURS = RESOLUTION_SLA_HOURS['MEDIUM']!;

// ---------------------------------------------------------------------------
// Rate calculation precision
// ---------------------------------------------------------------------------

/** Decimal places for all percentage/rate values returned by analytics. */
export const RATE_DECIMAL_PLACES = 2;

/**
 * Decimal places for time duration values (hours).
 * e.g. 2.75 hours = 2 hours 45 minutes
 */
export const DURATION_DECIMAL_PLACES = 2;

// ---------------------------------------------------------------------------
// Complaint status groups
//
// Centralised here so that both analytics.utils.ts and analytics.repository.ts
// reference the same groupings. If the complaint lifecycle gains new statuses
// in future phases, only this file needs updating.
// ---------------------------------------------------------------------------

/** Statuses where a complaint is still being worked on. */
export const OPEN_STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] as const;

/**
 * Statuses where meaningful resolution occurred.
 * Used in resolutionRate denominator.
 * RESOLVED and VERIFIED both count — VERIFIED is a superset of RESOLVED.
 */
export const RESOLVED_STATUSES = ['RESOLVED', 'VERIFIED'] as const;

/**
 * All statuses that represent a terminal state — the complaint lifecycle is over.
 * Used in closureRate calculation.
 */
export const CLOSED_STATUSES = ['RESOLVED', 'VERIFIED', 'REJECTED'] as const;

/**
 * Terminal statuses that represent a negative outcome — resolution was either
 * refused or citizen-rejected. Tracked separately for governance scorecards.
 */
export const NEGATIVE_TERMINAL_STATUSES = ['REJECTED'] as const;

// ---------------------------------------------------------------------------
// Assignment source labels (for governance metric descriptions)
// ---------------------------------------------------------------------------

export const ASSIGNMENT_SOURCE_ANALYTICS_LABEL: Record<string, string> = {
  AUTO: 'Automatic (geo lookup)',
  MANUAL: 'Manual (admin override)',
  UNMATCHED: 'Unmatched (no geo coverage)',
};

// ---------------------------------------------------------------------------
// Governance scorecard thresholds
//
// These are the target values for a well-functioning governance system.
// Used in future leaderboard colouring and public transparency dashboards:
//   green  = at or above TARGET
//   yellow = at or above ACCEPTABLE
//   red    = below ACCEPTABLE
// ---------------------------------------------------------------------------

export const GOVERNANCE_THRESHOLDS = {
  verifiedResolutionRate: {
    TARGET: 70, // 70% of all complaints citizen-verified as resolved
    ACCEPTABLE: 50,
  },
  resolutionRate: {
    TARGET: 85,
    ACCEPTABLE: 60,
  },
  avgResolutionTimeHours: {
    TARGET: 48, // 2 days
    ACCEPTABLE: 120, // 5 days — values BELOW target are better
  },
  citizenApprovalRate: {
    TARGET: 80,
    ACCEPTABLE: 60,
  },
  assignmentEfficiency: {
    TARGET: 90, // 90% auto-assigned
    ACCEPTABLE: 70,
  },
} as const;

export type GovernanceThresholdKey = keyof typeof GOVERNANCE_THRESHOLDS;
