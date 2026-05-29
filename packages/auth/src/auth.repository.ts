import type { PrismaClient, User } from '@awaaz/db';
import type { PrismaUserRole } from '@awaaz/types';
import { prismaRoleToAppRole, type AuthUser } from '@awaaz/types';

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    phoneNumber: user.phoneNumber,
    role: prismaRoleToAppRole(user.role),
    isVerified: user.isVerified,
    reputationScore: user.reputationScore,
  };
}

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async findUserByPhone(phoneNumber: string): Promise<AuthUser | null> {
    const user = await this.db.user.findUnique({ where: { phoneNumber } });
    return user ? toAuthUser(user) : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? toAuthUser(user) : null;
  }

  async createUser(input: {
    phoneNumber: string;
    name?: string;
    role?: PrismaUserRole;
  }): Promise<AuthUser> {
    const user = await this.db.user.create({
      data: {
        phoneNumber: input.phoneNumber,
        name: input.name ?? null,
        role: input.role ?? 'CITIZEN',
        isVerified: true,
      },
    });
    return toAuthUser(user);
  }

  async updateUserName(id: string, name: string): Promise<AuthUser> {
    const user = await this.db.user.update({
      where: { id },
      data: { name },
    });
    return toAuthUser(user);
  }

  async getLatestOtp(phoneNumber: string) {
    return this.db.oTPVerification.findFirst({
      where: { phoneNumber },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOtp(input: { phoneNumber: string; otpHash: string; expiresAt: Date }) {
    return this.db.oTPVerification.create({ data: input });
  }

  async incrementOtpAttempts(id: string) {
    return this.db.oTPVerification.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async deleteOtp(id: string) {
    return this.db.oTPVerification.delete({ where: { id } });
  }

  async deleteExpiredOtps(before: Date) {
    return this.db.oTPVerification.deleteMany({
      where: { expiresAt: { lt: before } },
    });
  }

  async createRefreshToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.db.refreshToken.create({ data: input });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return this.db.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async deleteRefreshToken(id: string) {
    return this.db.refreshToken.delete({ where: { id } });
  }

  async deleteRefreshTokenByHash(tokenHash: string) {
    return this.db.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async deleteAllRefreshTokensForUser(userId: string) {
    return this.db.refreshToken.deleteMany({ where: { userId } });
  }

  async deleteRefreshTokenForUser(userId: string, tokenHash: string) {
    return this.db.refreshToken.deleteMany({
      where: { userId, tokenHash },
    });
  }
}
