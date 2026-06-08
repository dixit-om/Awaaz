import type { UserService } from '@awaaz/auth';
import {
  listUsersSchema,
  adminUserIdSchema,
  updateUserRoleSchema,
  setUserActiveSchema,
} from '@awaaz/validation';
import { protectedProcedure, requireRole, router } from '../server';

/** Admin-only procedure: must be authenticated + have role 'admin'. */
const adminProcedure = protectedProcedure.use(requireRole('admin'));

export function createUsersRouter(userService: UserService) {
  return router({
    /**
     * Paginated list of all users with optional role / status / search filters.
     * Admin only.
     */
    list: adminProcedure.input(listUsersSchema).query(({ input }) => {
      return userService.listUsers(input);
    }),

    /**
     * Get a single user by ID with full admin detail.
     * Admin only.
     */
    getById: adminProcedure.input(adminUserIdSchema).query(({ input }) => {
      return userService.getUserById(input.id);
    }),

    /**
     * Change a user's role (citizen ↔ mla ↔ admin).
     * Admin only.
     */
    updateRole: adminProcedure.input(updateUserRoleSchema).mutation(({ input }) => {
      return userService.updateUserRole(input.id, input.role);
    }),

    /**
     * Activate or deactivate a user account.
     * Admin only.
     */
    setActive: adminProcedure.input(setUserActiveSchema).mutation(({ input }) => {
      return userService.setUserActive(input.id, input.isActive);
    }),

    /**
     * Aggregate user statistics for the admin dashboard KPI cards.
     * Admin only.
     */
    getStats: adminProcedure.query(() => {
      return userService.getStats();
    }),
  });
}
