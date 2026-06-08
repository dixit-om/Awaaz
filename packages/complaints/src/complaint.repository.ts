import type { PrismaClient, Prisma } from '@awaaz/db';
import type {
  ComplaintAuthor,
  ComplaintCategoryDetail,
  ComplaintCategoryItem,
  ComplaintDetail,
  ComplaintHistoryItem,
  ComplaintMediaItem,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintStatusUpdateResult,
  ComplaintSummary,
  CreateComplaintInput,
  ListComplaintsInput,
  MediaType,
  MediaStatus,
  ModerationStatus,
} from '@awaaz/types';

// ---------------------------------------------------------------------------
// Prisma select fragments
// ---------------------------------------------------------------------------

const authorSelect = {
  id: true,
  name: true,
} satisfies Prisma.UserSelect;

const categoryDetailSelect = {
  id: true,
  name: true,
  slug: true,
  icon: true,
} satisfies Prisma.ComplaintCategorySelect;

const mediaSelect = {
  id: true,
  mediaType: true,
  secureUrl: true,
  thumbnailUrl: true,
  width: true,
  height: true,
  durationSec: true,
  status: true,
  moderationStatus: true,
  sortOrder: true,
  uploadedAt: true,
} satisfies Prisma.MediaAssetSelect;

const historySelect = {
  id: true,
  previousStatus: true,
  newStatus: true,
  remarks: true,
  createdAt: true,
  changedBy: { select: authorSelect },
} satisfies Prisma.ComplaintStatusHistorySelect;

const complaintDetailSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  latitude: true,
  longitude: true,
  address: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  category: { select: categoryDetailSelect },
  citizen: { select: authorSelect },
  assignedAuthority: { select: authorSelect },
  media: { select: mediaSelect, orderBy: { sortOrder: 'asc' as const } },
  statusHistory: { select: historySelect, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.ComplaintSelect;

const complaintSummarySelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  latitude: true,
  longitude: true,
  address: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true, slug: true, icon: true } },
  citizen: { select: authorSelect },
  assignedAuthority: { select: authorSelect },
  _count: { select: { media: true } },
} satisfies Prisma.ComplaintSelect;

// ---------------------------------------------------------------------------
// Mappers (Prisma → domain types)
// ---------------------------------------------------------------------------

type PrismaDecimal = { toNumber(): number };

function toDetail(
  row: Prisma.ComplaintGetPayload<{ select: typeof complaintDetailSelect }>,
): ComplaintDetail {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as ComplaintStatus,
    priority: row.priority as ComplaintPriority,
    category: row.category as ComplaintCategoryDetail,
    location: {
      latitude: (row.latitude as unknown as PrismaDecimal).toNumber(),
      longitude: (row.longitude as unknown as PrismaDecimal).toNumber(),
      address: row.address,
    },
    citizen: row.citizen as ComplaintAuthor,
    assignedAuthority: row.assignedAuthority as ComplaintAuthor | null,
    media: row.media.map((m) => ({
      id: m.id,
      mediaType: m.mediaType as MediaType,
      secureUrl: m.secureUrl,
      thumbnailUrl: m.thumbnailUrl,
      width: m.width,
      height: m.height,
      durationSec: m.durationSec,
      status: m.status as MediaStatus,
      moderationStatus: m.moderationStatus as ModerationStatus,
      sortOrder: m.sortOrder,
      uploadedAt: m.uploadedAt,
    })) satisfies ComplaintMediaItem[],
    statusHistory: row.statusHistory.map((h) => ({
      id: h.id,
      previousStatus: h.previousStatus as ComplaintStatus | null,
      newStatus: h.newStatus as ComplaintStatus,
      changedBy: h.changedBy as ComplaintAuthor,
      remarks: h.remarks,
      createdAt: h.createdAt,
    })) satisfies ComplaintHistoryItem[],
    isPublic: row.isPublic,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSummary(
  row: Prisma.ComplaintGetPayload<{ select: typeof complaintSummarySelect }>,
): ComplaintSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status as ComplaintStatus,
    priority: row.priority as ComplaintPriority,
    category: { name: row.category.name, slug: row.category.slug, icon: row.category.icon },
    location: {
      latitude: (row.latitude as unknown as PrismaDecimal).toNumber(),
      longitude: (row.longitude as unknown as PrismaDecimal).toNumber(),
      address: row.address,
    },
    citizen: row.citizen as ComplaintAuthor,
    assignedAuthority: row.assignedAuthority as ComplaintAuthor | null,
    mediaCount: row._count.media,
    isPublic: row.isPublic,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ComplaintRepository {
  constructor(private readonly db: PrismaClient) {}

  // ------------------------------------------------------------------
  // Complaint reads
  // ------------------------------------------------------------------

  async findById(id: string): Promise<ComplaintDetail | null> {
    const row = await this.db.complaint.findUnique({
      where: { id, deletedAt: null },
      select: complaintDetailSelect,
    });
    return row ? toDetail(row) : null;
  }

  async findByIdRaw(id: string) {
    return this.db.complaint.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, status: true, citizenId: true, assignedAuthorityId: true },
    });
  }

  async list(
    scope: 'citizen' | 'authority' | 'admin',
    scopeId: string | null,
    filters: ListComplaintsInput,
  ): Promise<{ items: ComplaintSummary[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ComplaintWhereInput = {
      deletedAt: null,
      ...(scope === 'citizen' && scopeId ? { citizenId: scopeId } : {}),
      ...(scope === 'authority' && scopeId ? { assignedAuthorityId: scopeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lte: filters.toDate } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.complaint.findMany({
        where,
        select: complaintSummarySelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.complaint.count({ where }),
    ]);

    return { items: rows.map(toSummary), total };
  }

  // ------------------------------------------------------------------
  // Complaint writes
  // ------------------------------------------------------------------

  async create(input: CreateComplaintInput, citizenId: string): Promise<ComplaintDetail> {
    // Phase 7: media is uploaded separately via media.createUploadRequest /
    // media.confirmUpload after the complaint is created. No inline media
    // creation happens here.
    const row = await this.db.complaint.create({
      data: {
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        citizenId,
        latitude: input.latitude,
        longitude: input.longitude,
        address: input.address ?? null,
        priority: input.priority ?? 'MEDIUM',
        isPublic: input.isPublic ?? true,
        status: 'SUBMITTED',
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: 'SUBMITTED',
            changedById: citizenId,
          },
        },
      },
      select: complaintDetailSelect,
    });
    return toDetail(row);
  }

  async updateStatus(
    id: string,
    newStatus: ComplaintStatus,
    changedById: string,
    opts: {
      remarks?: string;
      assignedAuthorityId?: string | null;
    } = {},
  ): Promise<ComplaintStatusUpdateResult> {
    const [updated, history] = await this.db.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id },
        data: {
          status: newStatus,
          ...(opts.assignedAuthorityId !== undefined
            ? { assignedAuthorityId: opts.assignedAuthorityId }
            : {}),
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          assignedAuthority: { select: authorSelect },
        },
      });

      const entry = await tx.complaintStatusHistory.create({
        data: {
          complaintId: id,
          previousStatus: await tx.complaint
            .findUnique({ where: { id }, select: { status: true } })
            .then((c) => c?.status ?? null),
          newStatus,
          changedById,
          remarks: opts.remarks ?? null,
        },
        select: historySelect,
      });

      return [complaint, entry];
    });

    return {
      id: updated.id,
      status: updated.status as ComplaintStatus,
      assignedAuthority: updated.assignedAuthority as ComplaintAuthor | null,
      historyEntry: {
        id: history.id,
        previousStatus: history.previousStatus as ComplaintStatus | null,
        newStatus: history.newStatus as ComplaintStatus,
        changedBy: history.changedBy as ComplaintAuthor,
        remarks: history.remarks,
        createdAt: history.createdAt,
      },
      updatedAt: updated.updatedAt,
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.db.complaint.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ------------------------------------------------------------------
  // Category reads
  // ------------------------------------------------------------------

  async findCategoryById(id: string) {
    return this.db.complaintCategory.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, icon: true, isActive: true },
    });
  }

  async listActiveCategories(): Promise<ComplaintCategoryItem[]> {
    return this.db.complaintCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, icon: true, sortOrder: true },
    });
  }

  // ------------------------------------------------------------------
  // Geo stub (Phase 3: PostGIS ST_DWithin)
  // ------------------------------------------------------------------

  async findNearby(_lat: number, _lng: number, _radiusKm: number): Promise<ComplaintSummary[]> {
    // TODO Phase 3: replace with ST_DWithin PostGIS query
    return [];
  }
}
