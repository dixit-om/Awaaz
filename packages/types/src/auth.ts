import type { UserRole } from './role';

/** Authenticated user attached to tRPC context (no secrets). */
export type AuthUser = {
  id: string;
  name: string | null;
  phoneNumber: string;
  role: UserRole;
  isVerified: boolean;
  reputationScore: number;
};

/** Full admin view of a user (includes isActive + timestamps). */
export type AdminUser = AuthUser & {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Aggregate stats returned by users.getStats. */
export type UserStats = {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    citizen: number;
    mla: number;
    admin: number;
  };
};

/** Paginated list of admin users. */
export type ListUsersResult = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** JWT access token payload */
export type JwtAccessPayload = {
  sub: string;
  role: UserRole;
};

/** Tokens returned after login / refresh */
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/** Public user profile (API responses) */
export type UserProfile = AuthUser;
