import { TRPCError } from '@trpc/server';
import type { AdminUser, ListUsersResult, UserRole, UserStats } from '@awaaz/types';
import type { AuthRepository } from './auth.repository.js';

export class UserService {
  constructor(private readonly repo: AuthRepository) {}

  async listUsers(params: {
    page: number;
    limit: number;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
  }): Promise<ListUsersResult> {
    const { users, total } = await this.repo.listUsers(params);
    return {
      users,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async getUserById(id: string): Promise<AdminUser> {
    const user = await this.repo.getAdminUserById(id);
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return user;
  }

  async updateUserRole(id: string, role: UserRole): Promise<AdminUser> {
    const existing = await this.repo.getAdminUserById(id);
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return this.repo.updateUserRole(id, role);
  }

  async setUserActive(id: string, isActive: boolean): Promise<AdminUser> {
    const existing = await this.repo.getAdminUserById(id);
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return this.repo.setUserActive(id, isActive);
  }

  async getStats(): Promise<UserStats> {
    return this.repo.getUserStats();
  }
}
