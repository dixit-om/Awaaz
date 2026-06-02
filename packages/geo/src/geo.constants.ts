import type { AssignmentSource, ConstituencyType } from '@awaaz/types';

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const GEO_ERROR = {
  // Constituency errors
  CONSTITUENCY_NOT_FOUND: 'GEO_CONSTITUENCY_NOT_FOUND',
  CONSTITUENCY_INACTIVE: 'GEO_CONSTITUENCY_INACTIVE',
  NO_POLYGON_MATCH: 'GEO_NO_POLYGON_MATCH',

  // Authority assignment errors
  AUTHORITY_NOT_FOUND: 'GEO_AUTHORITY_NOT_FOUND',
  AUTHORITY_INVALID_ROLE: 'GEO_AUTHORITY_INVALID_ROLE',
  ASSIGNMENT_NOT_FOUND: 'GEO_ASSIGNMENT_NOT_FOUND',
  ASSIGNMENT_ALREADY_ACTIVE: 'GEO_ASSIGNMENT_ALREADY_ACTIVE',
  NO_ACTIVE_ASSIGNMENT: 'GEO_NO_ACTIVE_ASSIGNMENT',

  // Complaint assignment errors
  COMPLAINT_NOT_FOUND: 'GEO_COMPLAINT_NOT_FOUND',
  COMPLAINT_ALREADY_ASSIGNED: 'GEO_COMPLAINT_ALREADY_ASSIGNED',

  // Boundary version errors
  BOUNDARY_VERSION_NOT_FOUND: 'GEO_BOUNDARY_VERSION_NOT_FOUND',
  BOUNDARY_VERSION_ALREADY_ACTIVE: 'GEO_BOUNDARY_VERSION_ALREADY_ACTIVE',

  // Geo data errors
  INVALID_GEOJSON: 'GEO_INVALID_GEOJSON',
  INVALID_COORDINATES: 'GEO_INVALID_COORDINATES',
  POSTGIS_ERROR: 'GEO_POSTGIS_ERROR',
} as const;

export type GeoErrorCode = (typeof GEO_ERROR)[keyof typeof GEO_ERROR];

// ---------------------------------------------------------------------------
// Assignment source labels (UI / audit logs)
// ---------------------------------------------------------------------------

export const ASSIGNMENT_SOURCE_LABEL: Record<AssignmentSource, string> = {
  AUTO: 'Auto-assigned by system',
  MANUAL: 'Manually assigned by admin',
  UNMATCHED: 'Unmatched — no constituency found',
};

// ---------------------------------------------------------------------------
// Constituency type labels
// ---------------------------------------------------------------------------

export const CONSTITUENCY_TYPE_LABEL: Record<ConstituencyType, string> = {
  WARD: 'Ward',
  ASSEMBLY: 'Assembly Constituency',
  PARLIAMENTARY: 'Parliamentary Constituency',
};

// ---------------------------------------------------------------------------
// SLA thresholds (hours) — used for future dashboard indicators
// Auto-assigned complaints not updated within these windows are flagged.
// ---------------------------------------------------------------------------

export const ASSIGNMENT_SLA_HOURS: Record<ConstituencyType, number> = {
  WARD: 24,
  ASSEMBLY: 48,
  PARLIAMENTARY: 72,
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the assignment source indicates the complaint was
 * successfully matched to a constituency (AUTO or MANUAL).
 */
export function isAssigned(source: AssignmentSource): boolean {
  return source === 'AUTO' || source === 'MANUAL';
}

/**
 * Returns true if the complaint could not be matched to any constituency.
 */
export function isUnmatched(source: AssignmentSource): boolean {
  return source === 'UNMATCHED';
}

/**
 * Returns a human-readable label for why an assignment failed.
 */
export function unmatchedReasonLabel(reason: 'NO_POLYGON_MATCH' | 'POSTGIS_UNAVAILABLE'): string {
  switch (reason) {
    case 'NO_POLYGON_MATCH':
      return 'Complaint coordinates do not fall within any known constituency boundary';
    case 'POSTGIS_UNAVAILABLE':
      return 'Geo lookup service temporarily unavailable — complaint queued for manual assignment';
  }
}

/**
 * Returns the SLA threshold in hours for a given constituency type.
 * Used to flag overdue assignments in dashboards.
 */
export function assignmentSlaHours(type: ConstituencyType): number {
  return ASSIGNMENT_SLA_HOURS[type];
}
