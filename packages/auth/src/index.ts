export { AUTH_ERROR, type AuthErrorCode } from './auth.constants.js';
export { AuthRepository } from './auth.repository.js';
export { AuthService } from './auth.service.js';
export { UserService } from './user.service.js';
export { signAccessToken, verifyAccessToken } from './jwt.js';
export { ConsoleOtpSender } from './otp-sender.js';
export { noopRateLimiter, type OtpSender, type RateLimiter } from './auth.types.js';

import type { PrismaClient } from '@awaaz/db';
import type { AuthConfig } from '@awaaz/config';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { UserService } from './user.service.js';
import { ConsoleOtpSender } from './otp-sender.js';
import { noopRateLimiter } from './auth.types.js';

export function createAuthService(db: PrismaClient, config: AuthConfig): AuthService {
  const repo = new AuthRepository(db);
  const otpSender = new ConsoleOtpSender(config);
  return new AuthService(repo, config, otpSender, noopRateLimiter);
}

export function createUserService(db: PrismaClient): UserService {
  const repo = new AuthRepository(db);
  return new UserService(repo);
}
