'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import type { UserRole } from '@awaaz/types';
import { useAuth } from '@/contexts/auth-context';

interface AuthGuardProps {
  /** If provided, only users with this role (or admin) can access. */
  requiredRole?: UserRole;
  children: React.ReactNode;
}

/** Minimal full-screen loading spinner that matches the design system. */
function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8fafc]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e40af]">
        <Megaphone className="h-6 w-6 text-white" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e2e8f0] border-t-[#1e40af]" />
        <p className="text-sm text-[#94a3b8]">Loading…</p>
      </div>
    </div>
  );
}

/**
 * Client-side route guard.
 *
 * - While auth is resolving → shows LoadingScreen
 * - Not authenticated → redirects to /login
 * - Wrong role → redirects to the correct dashboard (or /login)
 * - Correct role → renders children
 *
 * Admin users pass any role check (super-access).
 */
export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!requiredRole) return; // no role restriction

    const role = user?.role;

    // Admin can access everything.
    if (role === 'admin') return;

    if (role !== requiredRole) {
      // Redirect to the correct dashboard for the user's actual role.
      const ROLE_HOME: Record<UserRole, string> = {
        citizen: '/dashboard',
        mla: '/mla',
        admin: '/admin',
      };
      router.replace(ROLE_HOME[role ?? 'citizen']);
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router]);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoadingScreen />; // redirect in flight
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <LoadingScreen />; // redirect in flight
  }

  return <>{children}</>;
}
