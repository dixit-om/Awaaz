import type { PrismaClient, User } from '@awaaz/db';
import type { AdminUser, PrismaUserRole, UserStats } from '@awaaz/types';
import {
  prismaRoleToAppRole,
  appRoleToPrismaRole,
  type AuthUser,
  type UserRole,
} from '@awaaz/types';

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

function toAdminUser(user: User): AdminUser {
  return {
    ...toAuthUser(user),
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
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

  // ── Admin user management ────────────────────────────────────────────

  async listUsers(params: {
    page: number;
    limit: number;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
  }): Promise<{ users: AdminUser[]; total: number }> {
    const { page, limit, role, isActive, search } = params;
    const skip = (page - 1) * limit;

    // Build filter dynamically; cast to avoid wrestling with deep Prisma generics.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (role !== undefined) where.role = appRoleToPrismaRole(role);
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await this.db.$transaction([
      this.db.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.user.count({ where }),
    ]);

    return { users: users.map(toAdminUser), total };
  }

  async getAdminUserById(id: string): Promise<AdminUser | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? toAdminUser(user) : null;
  }

  async updateUserRole(id: string, role: UserRole): Promise<AdminUser> {
    const user = await this.db.user.update({
      where: { id },
      data: { role: appRoleToPrismaRole(role) },
    });
    return toAdminUser(user);
  }

  async setUserActive(id: string, isActive: boolean): Promise<AdminUser> {
    const user = await this.db.user.update({
      where: { id },
      data: { isActive },
    });
    return toAdminUser(user);
  }

  async getUserStats(): Promise<UserStats> {
    const [total, active, byCitizen, byMla, byAdmin] = await this.db.$transaction([
      this.db.user.count(),
      this.db.user.count({ where: { isActive: true } }),
      this.db.user.count({ where: { role: 'CITIZEN' } }),
      this.db.user.count({ where: { role: 'MLA' } }),
      this.db.user.count({ where: { role: 'ADMIN' } }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      byRole: { citizen: byCitizen, mla: byMla, admin: byAdmin },
    };
  }
}
