/**
 * Client-side token management.
 *
 * Tokens are stored in localStorage under fixed keys.
 * All functions are SSR-safe: they no-op when window is undefined.
 */

const KEY_ACCESS = 'awaaz_access_token';
const KEY_REFRESH = 'awaaz_refresh_token';

// ─── Read ─────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_REFRESH);
}

export function hasTokens(): boolean {
  return !!getAccessToken() && !!getRefreshToken();
}

// ─── Write ────────────────────────────────────────────────────────────

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_ACCESS, accessToken);
  localStorage.setItem(KEY_REFRESH, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY_ACCESS);
  localStorage.removeItem(KEY_REFRESH);
}

// ─── JWT helpers ──────────────────────────────────────────────────────

interface JwtPayload {
  sub?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

/**
 * Decode a JWT payload without verification (client-side only).
 * Returns an empty object if the token is malformed.
 */
export function decodeJwt(token: string): JwtPayload {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return {};
    // Pad base64url → base64
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return {};
  }
}

/**
 * Returns the Unix timestamp (seconds) when the access token expires.
 * Returns 0 if the token is missing or unparseable.
 */
export function getAccessTokenExpiry(): number {
  const token = getAccessToken();
  if (!token) return 0;
  return decodeJwt(token).exp ?? 0;
}

/**
 * Returns true if the stored access token expires within `thresholdSecs`
 * seconds from now (default 120 s = 2 min).
 */
export function isAccessTokenExpiringSoon(thresholdSecs = 120): boolean {
  const exp = getAccessTokenExpiry();
  if (!exp) return true; // treat missing/bad token as expired
  return exp - Math.floor(Date.now() / 1000) < thresholdSecs;
}

/**
 * Returns true if the access token has already expired.
 */
export function isAccessTokenExpired(): boolean {
  return isAccessTokenExpiringSoon(0);
}
