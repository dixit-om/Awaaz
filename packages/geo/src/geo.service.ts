import { TRPCError } from '@trpc/server';
import type { AuthUser } from '@awaaz/types';
import type {
  AssignComplaintToAuthorityInput,
  AuthorityAssignmentDetail,
  ConstituencyDetail,
  ConstituencyLookupResult,
  ConstituencySummary,
  FindConstituencyByLocationInput,
  GeoAssignmentResult,
  ListAuthorityAssignmentsInput,
  ListConstituenciesInput,
  ManualAssignmentResult,
  PaginatedResponse,
} from '@awaaz/types';
import { GEO_ERROR } from './geo.constants.js';
import { isValidIndiaCoordinate } from './geo.utils.js';
import type { GeoRepository } from './geo.repository.js';

export class GeoService {
  constructor(private readonly repo: GeoRepository) {}

  // ---------------------------------------------------------------------------
  // resolveAndAssign — internal (called by ComplaintService, not tRPC)
  //
  // Never throws — returns a discriminated union result so ComplaintService
  // can decide how to handle unmatched complaints (leave SUBMITTED, alert admin).
  // ---------------------------------------------------------------------------

  async resolveAndAssign(
    complaintId: string,
    lat: number,
    lng: number,
  ): Promise<GeoAssignmentResult> {
    // Fast pre-filter: skip PostGIS if coordinates are outside India
    if (!isValidIndiaCoordinate(lat, lng)) {
      await this.repo.updateComplaintGeoAssignment(complaintId, {
        constituencyId: null,
        authorityId: null,
        source: 'UNMATCHED',
      });
      return {
        success: false,
        source: 'UNMATCHED',
        reason: 'Coordinates are outside the India bounding box',
      };
    }

    // Point-in-polygon lookup — wrapped in try/catch so PostGIS errors
    // degrade gracefully instead of failing the complaint creation.
    let constituencyId: string | null;
    try {
      constituencyId = await this.repo.findConstituencyByPoint(lat, lng);
    } catch {
      await this.repo.updateComplaintGeoAssignment(complaintId, {
        constituencyId: null,
        authorityId: null,
        source: 'UNMATCHED',
      });
      return {
        success: false,
        source: 'UNMATCHED',
        reason: 'PostGIS lookup failed — complaint queued for manual assignment',
      };
    }

    // No polygon matched — record as UNMATCHED for admin triage
    if (!constituencyId) {
      await this.repo.updateComplaintGeoAssignment(complaintId, {
        constituencyId: null,
        authorityId: null,
        source: 'UNMATCHED',
      });
      return {
        success: false,
        source: 'UNMATCHED',
        reason: 'Complaint coordinates do not fall within any known constituency',
      };
    }

    // Find the active authority for the matched constituency
    const assignment = await this.repo.findActiveAssignment(constituencyId);
    const authorityId = assignment?.authorityId ?? null;

    await this.repo.updateComplaintGeoAssignment(complaintId, {
      constituencyId,
      authorityId,
      source: 'AUTO',
    });

    return {
      success: true,
      source: 'AUTO',
      constituencyId,
      authorityId,
    };
  }

  // ---------------------------------------------------------------------------
  // findConstituencyByLocation — tRPC: geo.findConstituencyByLocation
  // Protected — any authenticated role may preview assignment before submitting.
  // ---------------------------------------------------------------------------

  async findConstituencyByLocation(
    _actor: AuthUser,
    input: FindConstituencyByLocationInput,
  ): Promise<ConstituencyLookupResult> {
    if (!isValidIndiaCoordinate(input.latitude, input.longitude)) {
      return {
        matched: false,
        reason: 'NO_POLYGON_MATCH',
      };
    }

    let constituencyId: string | null;
    try {
      constituencyId = await this.repo.findConstituencyByPoint(input.latitude, input.longitude);
    } catch {
      return {
        matched: false,
        reason: 'POSTGIS_UNAVAILABLE',
      };
    }

    if (!constituencyId) {
      return { matched: false, reason: 'NO_POLYGON_MATCH' };
    }

    const summary = await this.repo.findConstituencySummaryById(constituencyId);
    if (!summary) {
      return { matched: false, reason: 'NO_POLYGON_MATCH' };
    }

    return { matched: true, constituency: summary };
  }

  // ---------------------------------------------------------------------------
  // getConstituency — tRPC: geo.getConstituency
  // Protected — any authenticated role.
  // ---------------------------------------------------------------------------

  async getConstituency(_actor: AuthUser, id: string): Promise<ConstituencyDetail> {
    const constituency = await this.repo.findConstituencyById(id);
    if (!constituency) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: GEO_ERROR.CONSTITUENCY_NOT_FOUND,
      });
    }
    return constituency;
  }

  // ---------------------------------------------------------------------------
  // listConstituencies — tRPC: geo.listConstituencies
  // Protected — any authenticated role.
  // ---------------------------------------------------------------------------

  async listConstituencies(
    _actor: AuthUser,
    input: ListConstituenciesInput,
  ): Promise<PaginatedResponse<ConstituencySummary>> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const { items, total } = await this.repo.listConstituencies(input);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // assignComplaintToAuthority — tRPC: geo.assignComplaintToAuthority
  // Admin only — manual override of auto-assignment.
  // ---------------------------------------------------------------------------

  async assignComplaintToAuthority(
    actor: AuthUser,
    input: AssignComplaintToAuthorityInput,
  ): Promise<ManualAssignmentResult> {
    if (actor.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can manually assign complaints',
      });
    }

    // Verify complaint exists
    const complaint = await this.repo.findComplaintById(input.complaintId);
    if (!complaint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: GEO_ERROR.COMPLAINT_NOT_FOUND,
      });
    }

    // Resolve constituency: explicit override > existing on complaint
    const constituencyId = input.constituencyId ?? complaint.constituencyId;
    if (!constituencyId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'No constituencyId provided and complaint has no existing constituency. ' +
          'Provide constituencyId to assign.',
      });
    }

    // Verify constituency is active
    const constituency = await this.repo.findConstituencySummaryById(constituencyId);
    if (!constituency) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: GEO_ERROR.CONSTITUENCY_NOT_FOUND,
      });
    }
    if (!constituency.isActive) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: GEO_ERROR.CONSTITUENCY_INACTIVE,
      });
    }

    // Resolve authority: explicit > active assignment for the constituency
    let authorityId = input.authorityId ?? null;

    if (!authorityId) {
      const active = await this.repo.findActiveAssignment(constituencyId);
      if (!active) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: GEO_ERROR.NO_ACTIVE_ASSIGNMENT,
        });
      }
      authorityId = active.authorityId;
    }

    // Verify the resolved authority exists and has MLA role
    const authority = await this.repo.findUserById(authorityId);
    if (!authority) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: GEO_ERROR.AUTHORITY_NOT_FOUND,
      });
    }
    if (authority.role !== 'MLA') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: GEO_ERROR.AUTHORITY_INVALID_ROLE,
      });
    }

    const now = new Date();

    await this.repo.updateComplaintGeoAssignment(input.complaintId, {
      constituencyId,
      authorityId,
      source: 'MANUAL',
    });

    return {
      complaintId: input.complaintId,
      constituencyId,
      authorityId,
      assignmentSource: 'MANUAL',
      assignedAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  // listAuthorityAssignments — tRPC: geo.listAuthorityAssignments
  // Admin only.
  // ---------------------------------------------------------------------------

  async listAuthorityAssignments(
    actor: AuthUser,
    input: ListAuthorityAssignmentsInput,
  ): Promise<PaginatedResponse<AuthorityAssignmentDetail>> {
    if (actor.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view authority assignment history',
      });
    }

    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const { items, total } = await this.repo.listAssignments(input);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
