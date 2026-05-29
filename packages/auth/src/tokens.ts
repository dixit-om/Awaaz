import { createHash, randomBytes } from 'node:crypto';

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string, pepper: string): string {
  return createHash('sha256').update(`${token}:${pepper}`).digest('hex');
}
