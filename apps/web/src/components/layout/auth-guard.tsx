'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { UserRole } from '@awaaz/types';
import { useAuth } from '@/contexts/auth-context';
import { getRoleHome, isRoleAllowed } from '@/lib/role-routes';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface AuthGuardProps {
  /** If provided, only users with this role (or admin) can access. */
  requiredRole?: UserRole;
  children: React.ReactNode;
}

/**
 * Client-side route guard.
 *
 * Behaviours:
 *  - Auth resolving          → full-page LoadingScreen
 *  - Not authenticated       → /login?redirect=<currentPath>
 *  - Wrong role              → user's own home dashboard
 *  - Authenticated + correct role → renders children
 *
 * Admin bypasses every role check (super-access).
 */
export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Preserve the attempted URL so the login page can redirect back.
      const returnTo = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${returnTo}`);
      return;
    }

    if (requiredRole && !isRoleAllowed(user?.role, requiredRole)) {
      // Send the user to their own home, not to a forbidden error page.
      router.replace(getRoleHome(user?.role));
    }
  }, [isLoading, isAuthenticated, user, requiredRole, pathname, router]);

  // Show loading while auth state is resolving or redirect is in flight.
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoadingScreen message="Redirecting…" />;
  if (requiredRole && !isRoleAllowed(user?.role, requiredRole)) {
    return <LoadingScreen message="Redirecting…" />;
  }

  return <>{children}</>;
}
