import type { AuthConfig } from '@awaaz/config';
import { TRPCError } from '@trpc/server';
import type { AuthUser, TokenPair } from '@awaaz/types';
import type {
  LogoutInput,
  RefreshTokenInput,
  SendOtpInput,
  VerifyOtpInput,
} from '@awaaz/validation';
import type { OtpSender, RateLimiter } from './auth.types.js';
import { type AuthRepository } from './auth.repository.js';
import { signAccessToken } from './jwt.js';
import { generateOtp, hashOtp, verifyOtpHash } from './otp.js';
import { generateRefreshToken, hashRefreshToken } from './tokens.js';

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly config: AuthConfig,
    private readonly otpSender: OtpSender,
    private readonly rateLimiter: RateLimiter,
  ) {}

  private get pepper(): string {
    return this.config.OTP_PEPPER ?? this.config.JWT_REFRESH_SECRET;
  }

  async sendOtp(input: SendOtpInput): Promise<{ success: true; expiresInSeconds: number }> {
    const { phoneNumber } = input;

    await this.rateLimiter.check(`otp:send:${phoneNumber}`, {
      limit: 3,
      windowSec: 600,
    });

    const latest = await this.repo.getLatestOtp(phoneNumber);
    if (latest) {
      const cooldownMs = this.config.OTP_SEND_COOLDOWN_SECONDS * 1000;
      const elapsed = Date.now() - latest.createdAt.getTime();
      if (elapsed < cooldownMs) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Please wait before requesting another OTP',
        });
      }
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp, phoneNumber, this.pepper);
    const expiresAt = new Date(Date.now() + this.config.OTP_EXPIRY_SECONDS * 1000);

    await this.repo.createOtp({ phoneNumber, otpHash, expiresAt });
    await this.otpSender.send(phoneNumber, otp);

    return { success: true, expiresInSeconds: this.config.OTP_EXPIRY_SECONDS };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<{ user: AuthUser } & TokenPair> {
    const { phoneNumber, otp, name } = input;

    await this.rateLimiter.check(`otp:verify:${phoneNumber}`, {
      limit: 10,
      windowSec: 600,
    });

    const record = await this.repo.getLatestOtp(phoneNumber);
    if (!record) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired code',
      });
    }

    if (record.expiresAt < new Date()) {
      await this.repo.deleteOtp(record.id);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired code',
      });
    }

    if (record.attempts >= this.config.OTP_MAX_ATTEMPTS) {
      await this.repo.deleteOtp(record.id);
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts. Request a new OTP',
      });
    }

    // In dev mode, "000000" is a magic bypass OTP so developers can log in
    // without reading the server console every time.
    const isBypass = this.config.OTP_DEV_MODE && otp === '000000';
    const valid = isBypass || verifyOtpHash(otp, phoneNumber, this.pepper, record.otpHash);
    if (!valid) {
      await this.repo.incrementOtpAttempts(record.id);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired code',
      });
    }

    await this.repo.deleteOtp(record.id);

    let user = await this.repo.findUserByPhone(phoneNumber);
    if (!user) {
      if (!name?.trim()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Name is required for new registration',
        });
      }
      user = await this.repo.createUser({ phoneNumber, name: name.trim() });
    } else if (name?.trim() && !user.name) {
      user = await this.repo.updateUserName(user.id, name.trim());
    }

    const tokens = await this.issueTokenPair(user);
    return { user, ...tokens };
  }

  async refreshTokens(input: RefreshTokenInput): Promise<TokenPair> {
    const tokenHash = hashRefreshToken(input.refreshToken, this.pepper);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.repo.deleteRefreshToken(stored.id);
      }
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token',
      });
    }

    await this.repo.deleteRefreshToken(stored.id);

    const user = await this.repo.findUserById(stored.userId);
    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token',
      });
    }

    return this.issueTokenPair(user);
  }

  async logout(userId: string, input: LogoutInput): Promise<{ success: true }> {
    if (input.refreshToken) {
      const tokenHash = hashRefreshToken(input.refreshToken, this.pepper);
      await this.repo.deleteRefreshTokenForUser(userId, tokenHash);
    }
    return { success: true };
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }
    return user;
  }

  private async issueTokenPair(user: AuthUser): Promise<TokenPair> {
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken, this.pepper);
    const expiresAt = new Date(Date.now() + this.config.REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const accessToken = await signAccessToken(this.config, {
      userId: user.id,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
