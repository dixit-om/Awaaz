import type { PrismaClient, Prisma } from '@awaaz/db';
import type {
  ActiveAssignment,
  AssignmentSource,
  AuthorityAssignmentDetail,
  AuthorityRef,
  ConstituencyDetail,
  ConstituencySummary,
  ConstituencyType,
  ListAuthorityAssignmentsInput,
  ListConstituenciesInput,
} from '@awaaz/types';
import { makePointWkt } from './geo.utils.js';

// ---------------------------------------------------------------------------
// Prisma select fragments
// ---------------------------------------------------------------------------

const authorityRefSelect = {
  id: true,
  name: true,
  phoneNumber: true,
} satisfies Prisma.UserSelect;

const activeAssignmentSelect = {
  id: true,
  startDate: true,
  authority: { select: authorityRefSelect },
} satisfies Prisma.AuthorityAssignmentSelect;

const constituencyDetailSelect = {
  id: true,
  name: true,
  code: true,
  type: true,
  geoJson: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  authorityAssignments: {
    where: { isActive: true },
    take: 1,
    select: activeAssignmentSelect,
  },
} satisfies Prisma.ConstituencySelect;

const constituencySummarySelect = {
  id: true,
  name: true,
  code: true,
  type: true,
  isActive: true,
  authorityAssignments: {
    where: { isActive: true },
    take: 1,
    select: {
      id: true,
      authority: { select: authorityRefSelect },
    },
  },
} satisfies Prisma.ConstituencySelect;

const assignmentDetailSelect = {
  id: true,
  startDate: true,
  endDate: true,
  isActive: true,
  createdAt: true,
  constituency: { select: { id: true, name: true, code: true } },
  authority: { select: authorityRefSelect },
  assignedBy: { select: authorityRefSelect },
} satisfies Prisma.AuthorityAssignmentSelect;

// ---------------------------------------------------------------------------
// Mappers (Prisma → domain types)
// ---------------------------------------------------------------------------

type ConstituencyDetailRow = Prisma.ConstituencyGetPayload<{
  select: typeof constituencyDetailSelect;
}>;
type ConstituencySummaryRow = Prisma.ConstituencyGetPayload<{
  select: typeof constituencySummarySelect;
}>;
type AssignmentDetailRow = Prisma.AuthorityAssignmentGetPayload<{
  select: typeof assignmentDetailSelect;
}>;

function toConstituencyDetail(row: ConstituencyDetailRow): ConstituencyDetail {
  const assignment = row.authorityAssignments[0] ?? null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type as ConstituencyType,
    geoJson: row.geoJson,
    isActive: row.isActive,
    activeAssignment: assignment
      ? {
          id: assignment.id,
          authority: assignment.authority as AuthorityRef,
          startDate: assignment.startDate,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toConstituencySummary(row: ConstituencySummaryRow): ConstituencySummary {
  const assignment = row.authorityAssignments[0] ?? null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type as ConstituencyType,
    isActive: row.isActive,
    activeAssignment: assignment
      ? {
          id: assignment.id,
          authority: assignment.authority as AuthorityRef,
        }
      : null,
  };
}

function toAssignmentDetail(row: AssignmentDetailRow): AuthorityAssignmentDetail {
  return {
    id: row.id,
    constituency: row.constituency,
    authority: row.authority as AuthorityRef,
    assignedBy: row.assignedBy as AuthorityRef,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Raw PostGIS query result shape
// ---------------------------------------------------------------------------

interface PointInPolygonRow {
  id: string;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class GeoRepository {
  constructor(private readonly db: PrismaClient) {}

  // ------------------------------------------------------------------
  // PostGIS — Point-in-polygon lookup
  // ------------------------------------------------------------------

  /**
   * Finds the active constituency that spatially contains (lat, lng).
   * Returns the constituency id or null if no polygon matched.
   *
   * Uses ST_Contains(boundary, point) with a GiST-indexed geometry column.
   * Only queries active constituencies (isActive = true).
   *
   * NOTE: PostGIS uses (longitude, latitude) coordinate order.
   * makePointWkt enforces this internally.
   */
  async findConstituencyByPoint(lat: number, lng: number): Promise<string | null> {
    const pointExpr = makePointWkt(lat, lng);

    const rows = await this.db.$queryRaw<PointInPolygonRow[]>`
      SELECT id
      FROM constituencies
      WHERE "isActive" = true
        AND boundary IS NOT NULL
        AND ST_Contains(boundary, ${pointExpr}::geometry)
      LIMIT 1
    `;

    return rows[0]?.id ?? null;
  }

  // ------------------------------------------------------------------
  // Constituency reads
  // ------------------------------------------------------------------

  async findConstituencyById(id: string): Promise<ConstituencyDetail | null> {
    const row = await this.db.constituency.findUnique({
      where: { id },
      select: constituencyDetailSelect,
    });
    return row ? toConstituencyDetail(row) : null;
  }

  async findConstituencySummaryById(id: string): Promise<ConstituencySummary | null> {
    const row = await this.db.constituency.findUnique({
      where: { id },
      select: constituencySummarySelect,
    });
    return row ? toConstituencySummary(row) : null;
  }

  async listConstituencies(
    filters: ListConstituenciesInput,
  ): Promise<{ items: ConstituencySummary[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ConstituencyWhereInput = {
      ...(filters.type !== undefined ? { type: filters.type } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.constituency.findMany({
        where,
        select: constituencySummarySelect,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.db.constituency.count({ where }),
    ]);

    return { items: rows.map(toConstituencySummary), total };
  }

  // ------------------------------------------------------------------
  // Constituency writes
  // ------------------------------------------------------------------

  /**
   * Creates a constituency row including the PostGIS geometry boundary.
   *
   * Strategy: two-step write —
   *   1. $executeRaw INSERT to write both `geoJson` and `boundary` columns
   *      (Prisma cannot write the Unsupported geometry column).
   *   2. Prisma findUnique to return the typed ConstituencyDetail.
   *
   * Both steps are wrapped in a Prisma $transaction for atomicity.
   */
  async createConstituency(data: {
    id: string;
    name: string;
    code: string;
    type: ConstituencyType;
    geoJson: unknown;
    boundaryVersionId: string;
  }): Promise<ConstituencyDetail> {
    const geoJsonStr = JSON.stringify(data.geoJson);
    const now = new Date();

    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO constituencies (
          id, name, code, type, "geoJson", boundary,
          "boundaryVersionId", "isActive", "createdAt", "updatedAt"
        ) VALUES (
          ${data.id},
          ${data.name},
          ${data.code},
          ${data.type}::"ConstituencyType",
          ${geoJsonStr}::jsonb,
          ST_GeomFromGeoJSON(${geoJsonStr}),
          ${data.boundaryVersionId},
          true,
          ${now},
          ${now}
        )
        ON CONFLICT (code) DO NOTHING
      `;
    });

    const row = await this.db.constituency.findUnique({
      where: { code: data.code },
      select: constituencyDetailSelect,
    });

    if (!row) {
      throw new Error(`Constituency creation failed for code: ${data.code}`);
    }

    return toConstituencyDetail(row);
  }

  async deactivateConstituenciesByVersion(boundaryVersionId: string): Promise<void> {
    await this.db.constituency.updateMany({
      where: { boundaryVersionId },
      data: { isActive: false },
    });
  }

  // ------------------------------------------------------------------
  // Authority assignment reads
  // ------------------------------------------------------------------

  async findActiveAssignment(
    constituencyId: string,
  ): Promise<{ id: string; authorityId: string } | null> {
    const row = await this.db.authorityAssignment.findFirst({
      where: { constituencyId, isActive: true },
      select: { id: true, authorityId: true },
    });
    return row ?? null;
  }

  async findActiveAssignmentDetail(constituencyId: string): Promise<ActiveAssignment | null> {
    const row = await this.db.authorityAssignment.findFirst({
      where: { constituencyId, isActive: true },
      select: activeAssignmentSelect,
    });
    if (!row) return null;
    return {
      id: row.id,
      authority: row.authority as AuthorityRef,
      startDate: row.startDate,
    };
  }

  async findAssignmentById(id: string): Promise<AuthorityAssignmentDetail | null> {
    const row = await this.db.authorityAssignment.findUnique({
      where: { id },
      select: assignmentDetailSelect,
    });
    return row ? toAssignmentDetail(row) : null;
  }

  async listAssignments(
    filters: ListAuthorityAssignmentsInput,
  ): Promise<{ items: AuthorityAssignmentDetail[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuthorityAssignmentWhereInput = {
      ...(filters.constituencyId ? { constituencyId: filters.constituencyId } : {}),
      ...(filters.authorityId ? { authorityId: filters.authorityId } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.authorityAssignment.findMany({
        where,
        select: assignmentDetailSelect,
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.db.authorityAssignment.count({ where }),
    ]);

    return { items: rows.map(toAssignmentDetail), total };
  }

  // ------------------------------------------------------------------
  // Authority assignment writes
  // ------------------------------------------------------------------

  /**
   * Assigns an authority to a constituency.
   * If an active assignment already exists for the constituency, it is
   * closed (endDate = now, isActive = false) before creating the new one.
   * Both operations run in a single transaction.
   */
  async createAssignment(data: {
    id: string;
    constituencyId: string;
    authorityId: string;
    assignedById: string;
    startDate: Date;
  }): Promise<AuthorityAssignmentDetail> {
    const row = await this.db.$transaction(async (tx) => {
      // Close any existing active assignment for this constituency
      await tx.authorityAssignment.updateMany({
        where: { constituencyId: data.constituencyId, isActive: true },
        data: { isActive: false, endDate: data.startDate },
      });

      return tx.authorityAssignment.create({
        data: {
          id: data.id,
          constituencyId: data.constituencyId,
          authorityId: data.authorityId,
          assignedById: data.assignedById,
          startDate: data.startDate,
          isActive: true,
        },
        select: assignmentDetailSelect,
      });
    });

    return toAssignmentDetail(row);
  }

  async deactivateAssignment(id: string, endDate: Date): Promise<void> {
    await this.db.authorityAssignment.update({
      where: { id },
      data: { isActive: false, endDate },
    });
  }

  // ------------------------------------------------------------------
  // Complaint geo update
  // ------------------------------------------------------------------

  /**
   * Writes geo-assignment fields onto a complaint in a single update.
   * Called by ComplaintService after resolveAndAssign completes.
   * Keeps the geo write isolated from the complaint creation write.
   */
  async updateComplaintGeoAssignment(
    complaintId: string,
    opts: {
      constituencyId: string | null;
      authorityId: string | null;
      source: AssignmentSource;
    },
  ): Promise<void> {
    await this.db.complaint.update({
      where: { id: complaintId },
      data: {
        constituencyId: opts.constituencyId,
        assignedAuthorityId: opts.authorityId,
        assignmentSource: opts.source,
        // Only record assignedAt when an actual authority was found
        assignedAt: opts.authorityId ? new Date() : null,
        // Advance to ASSIGNED only when an authority is present
        ...(opts.authorityId ? { status: 'ASSIGNED' } : {}),
      },
    });
  }

  // ------------------------------------------------------------------
  // Boundary version
  // ------------------------------------------------------------------

  async findActiveBoundaryVersion(): Promise<{
    id: string;
    version: string;
  } | null> {
    return this.db.geoBoundaryVersion.findFirst({
      where: { isActive: true },
      select: { id: true, version: true },
    });
  }

  async createBoundaryVersion(data: {
    id: string;
    version: string;
    description?: string;
    importedById: string;
  }): Promise<{ id: string; version: string }> {
    return this.db.geoBoundaryVersion.create({
      data: {
        id: data.id,
        version: data.version,
        description: data.description ?? null,
        importedById: data.importedById,
        isActive: false,
      },
      select: { id: true, version: true },
    });
  }

  /**
   * Activates a boundary version and deactivates all others.
   * Both run in a transaction to ensure only one version is active at a time.
   */
  async activateBoundaryVersion(id: string): Promise<void> {
    await this.db.$transaction([
      this.db.geoBoundaryVersion.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.db.geoBoundaryVersion.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);
  }

  // ------------------------------------------------------------------
  // User validation helpers (used by service layer)
  // ------------------------------------------------------------------

  async findUserById(id: string): Promise<{
    id: string;
    role: string;
    name: string | null;
    phoneNumber: string;
  } | null> {
    return this.db.user.findUnique({
      where: { id },
      select: { id: true, role: true, name: true, phoneNumber: true },
    });
  }

  async findComplaintById(id: string): Promise<{
    id: string;
    constituencyId: string | null;
    assignedAuthorityId: string | null;
    assignmentSource: string | null;
  } | null> {
    return this.db.complaint.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        constituencyId: true,
        assignedAuthorityId: true,
        assignmentSource: true,
      },
    });
  }
}
