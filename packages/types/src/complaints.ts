import type { UserRole } from './role';

// ---------------------------------------------------------------------------
// Enums (app-level; mirror Prisma but decoupled from @prisma/client)
// ---------------------------------------------------------------------------

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'VERIFIED'
  | 'REJECTED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type MediaType = 'IMAGE' | 'VIDEO';

export type MediaUploadStatus = 'PENDING' | 'READY' | 'FAILED';

// ---------------------------------------------------------------------------
// Status transition table
// ---------------------------------------------------------------------------

/**
 * Allowed status transitions per role.
 * Key   = (fromStatus → toStatus)
 * Value = roles that may perform that transition
 */
export const ALLOWED_TRANSITIONS: Record<
  ComplaintStatus,
  Partial<Record<ComplaintStatus, UserRole[]>>
> = {
  SUBMITTED: {
    ASSIGNED: ['mla', 'admin'],
    REJECTED: ['admin'], // admin moderation (spam)
  },
  ASSIGNED: {
    IN_PROGRESS: ['mla', 'admin'],
  },
  IN_PROGRESS: {
    RESOLVED: ['mla', 'admin'],
  },
  RESOLVED: {
    VERIFIED: ['citizen'], // complaint owner only
    REJECTED: ['citizen'], // owner rejects resolution
  },
  VERIFIED: {}, // terminal
  REJECTED: {}, // terminal (reopen in Phase 2.5)
};

/** Terminal statuses — no further transitions allowed */
export const TERMINAL_STATUSES: ComplaintStatus[] = ['VERIFIED', 'REJECTED'];

/** Statuses where `remarks` is required when provided by a citizen */
export const REMARKS_REQUIRED_STATUSES: ComplaintStatus[] = ['REJECTED'];

// ---------------------------------------------------------------------------
// Embedded sub-types
// ---------------------------------------------------------------------------

/** Compact author reference embedded in responses */
export type ComplaintAuthor = {
  id: string;
  name: string | null;
};

export type ComplaintCategoryDetail = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type ComplaintLocation = {
  latitude: number;
  longitude: number;
  address: string | null;
};

export type ComplaintMediaItem = {
  id: string;
  mediaType: MediaType;
  mediaUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  uploadStatus: MediaUploadStatus;
  sortOrder: number;
};

export type ComplaintHistoryItem = {
  id: string;
  previousStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  changedBy: ComplaintAuthor;
  remarks: string | null;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Primary response shapes
// ---------------------------------------------------------------------------

/** Full complaint detail — returned by getComplaintById */
export type ComplaintDetail = {
  id: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  category: ComplaintCategoryDetail;
  location: ComplaintLocation;
  citizen: ComplaintAuthor;
  assignedAuthority: ComplaintAuthor | null;
  media: ComplaintMediaItem[];
  statusHistory: ComplaintHistoryItem[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Lightweight row — returned in list views */
export type ComplaintSummary = {
  id: string;
  title: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  category: Pick<ComplaintCategoryDetail, 'name' | 'slug' | 'icon'>;
  location: ComplaintLocation;
  citizen: ComplaintAuthor;
  assignedAuthority: ComplaintAuthor | null;
  mediaCount: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Returned after createComplaint */
export type ComplaintCreateResult = ComplaintDetail;

/** Returned after updateComplaintStatus */
export type ComplaintStatusUpdateResult = {
  id: string;
  status: ComplaintStatus;
  assignedAuthority: ComplaintAuthor | null;
  historyEntry: ComplaintHistoryItem;
  updatedAt: Date;
};

/** Single category (for listCategories) */
export type ComplaintCategoryItem = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
};

// ---------------------------------------------------------------------------
// Input types (used by service layer — mirrored from validation)
// ---------------------------------------------------------------------------

export type ComplaintMediaInput = {
  mediaType: MediaType;
  mediaUrl: string;
  mimeType?: string;
  fileSize?: number;
  sortOrder?: number;
};

export type CreateComplaintInput = {
  title: string;
  description: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  address?: string;
  priority?: ComplaintPriority;
  media: ComplaintMediaInput[];
  isPublic?: boolean;
};

export type UpdateComplaintStatusInput = {
  id: string;
  newStatus: ComplaintStatus;
  remarks?: string;
  assigneeId?: string; // for SUBMITTED → ASSIGNED
};

export type ListComplaintsInput = {
  page?: number;
  limit?: number;
  status?: ComplaintStatus;
  categoryId?: string;
  priority?: ComplaintPriority;
  fromDate?: Date;
  toDate?: Date;
};
