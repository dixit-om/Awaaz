// ---------------------------------------------------------------------------
// Geo Mapping & Authority Assignment — App-level types (Phase 3)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Enums (mirror Prisma enums — decoupled from @prisma/client)
// ---------------------------------------------------------------------------

/** How a complaint was matched to a constituency and authority. */
export type AssignmentSource = 'AUTO' | 'MANUAL' | 'UNMATCHED';

/** Geographic level of a constituency. */
export type ConstituencyType = 'WARD' | 'ASSEMBLY' | 'PARLIAMENTARY';

// ---------------------------------------------------------------------------
// Embedded sub-types
// ---------------------------------------------------------------------------

/** Compact authority reference embedded in constituency responses. */
export type AuthorityRef = {
  id: string;
  name: string | null;
  phoneNumber: string;
};

/** Active authority assignment embedded in constituency detail. */
export type ActiveAssignment = {
  id: string;
  authority: AuthorityRef;
  startDate: Date;
};

// ---------------------------------------------------------------------------
// Primary response shapes
// ---------------------------------------------------------------------------

/** Full constituency detail — returned by getConstituency. */
export type ConstituencyDetail = {
  id: string;
  name: string;
  code: string;
  type: ConstituencyType;
  /** Raw GeoJSON — ready to pass to Mapbox / Leaflet. */
  geoJson: unknown;
  isActive: boolean;
  activeAssignment: ActiveAssignment | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Lightweight row — returned in listConstituencies. */
export type ConstituencySummary = {
  id: string;
  name: string;
  code: string;
  type: ConstituencyType;
  isActive: boolean;
  activeAssignment: Pick<ActiveAssignment, 'id' | 'authority'> | null;
};

/** Result returned from findConstituencyByLocation. */
export type ConstituencyLookupResult =
  | {
      matched: true;
      constituency: ConstituencySummary;
    }
  | {
      matched: false;
      reason: 'NO_POLYGON_MATCH' | 'POSTGIS_UNAVAILABLE';
    };

/** Result returned from assignComplaintToAuthority (manual override). */
export type ManualAssignmentResult = {
  complaintId: string;
  constituencyId: string;
  authorityId: string;
  assignmentSource: 'MANUAL';
  assignedAt: Date;
};

/** Full authority assignment record — for admin list views. */
export type AuthorityAssignmentDetail = {
  id: string;
  constituency: Pick<ConstituencySummary, 'id' | 'name' | 'code'>;
  authority: AuthorityRef;
  assignedBy: AuthorityRef;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Internal result type used between service layers
// ---------------------------------------------------------------------------

/**
 * Result of the internal resolveAndAssign call made by ComplaintService
 * when a complaint is created.  Not exposed via tRPC directly.
 */
export type GeoAssignmentResult =
  | {
      success: true;
      constituencyId: string;
      authorityId: string | null;
      source: 'AUTO';
    }
  | {
      success: false;
      source: 'UNMATCHED';
      reason: string;
    };

// ---------------------------------------------------------------------------
// Input types (used by service layer — mirrored from validation schemas)
// ---------------------------------------------------------------------------

export type FindConstituencyByLocationInput = {
  latitude: number;
  longitude: number;
};

export type GetConstituencyInput = {
  id: string;
};

export type ListConstituenciesInput = {
  type?: ConstituencyType;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export type AssignComplaintToAuthorityInput = {
  complaintId: string;
  /** Explicit authority to assign. If omitted, looks up active assignment. */
  authorityId?: string;
  /** Explicit constituency override. If omitted, uses existing constituencyId. */
  constituencyId?: string;
  remarks?: string;
};

export type ListAuthorityAssignmentsInput = {
  constituencyId?: string;
  authorityId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};
