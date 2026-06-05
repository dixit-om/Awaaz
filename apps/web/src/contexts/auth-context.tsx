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
  // Start as loading only if there are stored tokens that we need to validate.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => hasTokens());

  const userRef = useRef(user);
  userRef.current = user;

  // ── Token refresh mutation ──────────────────────────────────────────
  const refreshMutation = trpc.auth.refreshToken.useMutation();

  // ── Logout mutation (fire-and-forget, best-effort) ──────────────────
  const logoutMutation = trpc.auth.logout.useMutation();
  const logoutMutRef = useRef(logoutMutation.mutate);
  logoutMutRef.current = logoutMutation.mutate;

  // ── getCurrentUser query ────────────────────────────────────────────
  const tokensExist = hasTokens();
  const currentUserQuery = trpc.auth.getCurrentUser.useQuery(undefined, {
    enabled: tokensExist,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // React to successful user fetch.
  useEffect(() => {
    if (currentUserQuery.data) {
      setUser(currentUserQuery.data);
      setIsLoading(false);
    }
  }, [currentUserQuery.data]);

  // React to failed user fetch — try a token refresh once.
  useEffect(() => {
    if (!currentUserQuery.error) return;
    const rt = getRefreshToken();
    if (rt) {
      refreshMutation
        .mutateAsync({ refreshToken: rt })
        .then((tokens) => {
          setTokens(tokens.accessToken, tokens.refreshToken);
          // Re-fetch user with the new token.
          void currentUserQuery.refetch();
        })
        .catch(() => {
          clearTokens();
          setUser(null);
          setIsLoading(false);
        });
    } else {
      clearTokens();
      setUser(null);
      setIsLoading(false);
    }
  }, [currentUserQuery.error]); // refreshMutation.mutateAsync is stable (React Query guarantee)

  // If there were no tokens at all on first mount, stop loading immediately.
  useEffect(() => {
    if (!tokensExist) setIsLoading(false);
  }, []); // intentional mount-only effect

  // ── Proactive token refresh (every 60 s) ───────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (!userRef.current) return;
      if (isAccessTokenExpiringSoon(120)) {
        const rt = getRefreshToken();
        if (rt) {
          refreshMutation
            .mutateAsync({ refreshToken: rt })
            .then((tokens) => {
              setTokens(tokens.accessToken, tokens.refreshToken);
            })
            .catch(() => {
              clearTokens();
              setUser(null);
              router.push('/login');
            });
        }
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []); // intentional mount-only interval; uses refs for stable access

  // ── Exposed actions ────────────────────────────────────────────────
  const login = useCallback((tokens: TokenPair, authUser: AuthUser) => {
    setTokens(tokens.accessToken, tokens.refreshToken);
    setUser(authUser);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    const rt = getRefreshToken();
    clearTokens();
    setUser(null);
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
