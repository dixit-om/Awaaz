'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser, TokenPair, UserRole } from '@awaaz/types';
import {
  clearTokens,
  getRefreshToken,
  hasTokens,
  isAccessTokenExpiringSoon,
  setTokens,
} from '@/lib/tokens';
import { trpc } from '@/trpc/client';

// ─── Types ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Store tokens + user after a successful verifyOTP. */
  login: (tokens: TokenPair, user: AuthUser) => void;
  /** Clear all auth state and redirect to /login. */
  logout: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  // Start loading only if there are tokens to validate.
  const [isLoading, setIsLoading] = useState(() => hasTokens());

  const userRef = useRef(user);
  userRef.current = user;

  // Concurrency guard: prevent overlapping refresh attempts.
  const isRefreshingRef = useRef(false);

  // ── Mutations ─────────────────────────────────────────────────────
  const refreshMutation = trpc.auth.refreshToken.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  // Keep stable ref so logout callback never re-creates due to mutation updates.
  const logoutMutRef = useRef(logoutMutation.mutate);
  logoutMutRef.current = logoutMutation.mutate;

  // ── getCurrentUser query ─────────────────────────────────────────
  const tokensExist = hasTokens();
  const currentUserQuery = trpc.auth.getCurrentUser.useQuery(undefined, {
    enabled: tokensExist,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // ── Reusable refresh helper ──────────────────────────────────────
  /**
   * Attempts to refresh the access token using the stored refresh token.
   * Concurrency-safe: concurrent calls coalesce into a no-op for the second caller.
   * Returns true if refresh succeeded, false otherwise.
   */
  const tryRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false; // already in flight
    const rt = getRefreshToken();
    if (!rt) return false;

    isRefreshingRef.current = true;
    try {
      const tokens = await refreshMutation.mutateAsync({ refreshToken: rt });
      setTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      clearTokens();
      setUser(null);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []); // refreshMutation.mutateAsync is stable per React Query guarantee

  // ── React to successful user fetch ──────────────────────────────
  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
      setIsLoading(false);
    }
  }, [currentUserQuery.data]);

  // ── React to failed user fetch — try refresh once ───────────────
  useEffect(() => {
    if (!currentUserQuery.error) return;

    void (async () => {
      const refreshed = await tryRefresh();
      if (refreshed) {
        void currentUserQuery.refetch();
      } else {
        setIsLoading(false);
      }
    })();
  }, [currentUserQuery.error]); // tryRefresh and refetch are stable

  // ── No tokens on mount — stop loading immediately ───────────────
  useEffect(() => {
    if (!tokensExist) setIsLoading(false);
  }, []); // intentional mount-only

  // ── Proactive token refresh (every 60 s) ────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (!userRef.current) return;
      if (isAccessTokenExpiringSoon(120)) {
        void tryRefresh().then((ok) => {
          if (!ok && !hasTokens()) {
            // Refresh failed and all tokens are gone → force logout.
            setUser(null);
            router.push('/login');
          }
        });
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []); // intentional mount-only interval; stable refs prevent stale closure

  // ── Exposed actions ──────────────────────────────────────────────
  const login = useCallback((tokens: TokenPair, authUser: AuthUser) => {
    setTokens(tokens.accessToken, tokens.refreshToken);
    setUser(authUser);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    const rt = getRefreshToken();
    clearTokens();
    setUser(null);
    isRefreshingRef.current = false;
    // Best-effort server-side session invalidation.
    if (rt) logoutMutRef.current({ refreshToken: rt });
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || (tokensExist && currentUserQuery.isLoading && !user),
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────

function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Full auth state + actions. */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}

/** Shorthand: the logged-in user or null. */
export function useCurrentUser(): AuthUser | null {
  return useAuthContext().user;
}

/** Shorthand: the user's role or null. */
export function useRole(): UserRole | null {
  return useAuthContext().user?.role ?? null;
}
