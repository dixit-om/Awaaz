/**
 * Shared domain types for AWAAZ.
 * Business entity types (User, Complaint, etc.) will be added in feature phases.
 */

/** Application user roles (RBAC foundation) */
export type UserRole = 'citizen' | 'mla' | 'admin';

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
