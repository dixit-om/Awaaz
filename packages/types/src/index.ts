export type { UserRole, PrismaUserRole } from './role';
export { appRoleToPrismaRole, prismaRoleToAppRole } from './role';

/** Standard API response wrapper */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

/** Pagination metadata for list endpoints */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type { AuthUser, JwtAccessPayload, TokenPair, UserProfile } from './auth';

export {
  type AssignmentSource,
  type ConstituencyType,
  type AuthorityRef,
  type ActiveAssignment,
  type ConstituencyDetail,
  type ConstituencySummary,
  type ConstituencyLookupResult,
  type ManualAssignmentResult,
  type AuthorityAssignmentDetail,
  type GeoAssignmentResult,
  type FindConstituencyByLocationInput,
  type GetConstituencyInput,
  type ListConstituenciesInput,
  type AssignComplaintToAuthorityInput,
  type ListAuthorityAssignmentsInput,
} from './geo';

export {
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  REMARKS_REQUIRED_STATUSES,
  type ComplaintStatus,
  type ComplaintPriority,
  type MediaType,
  type MediaUploadStatus,
  type ComplaintAuthor,
  type ComplaintCategoryDetail,
  type ComplaintCategoryItem,
  type ComplaintLocation,
  type ComplaintMediaItem,
  type ComplaintMediaInput,
  type ComplaintHistoryItem,
  type ComplaintDetail,
  type ComplaintSummary,
  type ComplaintCreateResult,
  type ComplaintStatusUpdateResult,
  type CreateComplaintInput,
  type UpdateComplaintStatusInput,
  type ListComplaintsInput,
} from './complaints';
