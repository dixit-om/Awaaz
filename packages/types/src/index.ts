/**
 * Shared domain types for AWAAZ.
 * Business entity types (User, Complaint, etc.) will be added in feature phases.
 */

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
