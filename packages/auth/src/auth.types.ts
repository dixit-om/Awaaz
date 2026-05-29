export type { AuthUser, TokenPair, UserProfile } from '@awaaz/types';
export type {
  SendOtpInput,
  VerifyOtpInput,
  RefreshTokenInput,
  LogoutInput,
} from '@awaaz/validation';

export interface OtpSender {
  send(phoneNumber: string, otp: string): Promise<void>;
}

export interface RateLimiter {
  check(key: string, options: { limit: number; windowSec: number }): Promise<void>;
}

/** No-op rate limiter until Redis is wired */
export const noopRateLimiter: RateLimiter = {
  async check() {
    /* Redis-backed limiter in Phase 1.5 */
  },
};
