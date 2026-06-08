import type { UserRole } from '@awaaz/types';

/**
 * Single source of truth for role → home page mapping.
 *
 * Imported by:
 *   - src/app/login/page.tsx        (post-login redirect)
 *   - src/components/layout/auth-guard.tsx  (wrong-role redirect)
 *   - src/contexts/auth-context.tsx  (proactive refresh failure redirect)
 *
 * Keep this file import-free so it never pulls in React or browser APIs.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  citizen: '/dashboard',
  mla: '/mla',
  admin: '/admin',
};

/**
 * Returns the default home path for a user.
 * Falls back to '/dashboard' for unknown/null roles.
 */
export function getRoleHome(role: UserRole | null | undefined): string {
  if (!role) return '/login';
  return ROLE_HOME[role];
}

/**
 * Returns true if `role` is allowed to access a route that requires
 * `requiredRole`. Admin always has access.
 */
export function isRoleAllowed(role: UserRole | null | undefined, requiredRole: UserRole): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  return role === requiredRole;
}
