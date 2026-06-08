import { z } from 'zod';

const userIdSchema = z.string().min(1, 'User ID is required');

// ─── List Users ───────────────────────────────────────────────────────

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  /** Filter by app-level role string */
  role: z.enum(['citizen', 'mla', 'admin']).optional(),
  /** Filter by active/inactive status */
  isActive: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional(),
  /** Full-text search on name or phone number */
  search: z.string().max(100).trim().optional(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;

// ─── Get Single User ─────────────────────────────────────────────────

export const adminUserIdSchema = z.object({ id: userIdSchema });

export type AdminUserIdInput = z.infer<typeof adminUserIdSchema>;

// ─── Update Role ─────────────────────────────────────────────────────

export const updateUserRoleSchema = z.object({
  id: userIdSchema,
  role: z.enum(['citizen', 'mla', 'admin']),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// ─── Activate / Deactivate ────────────────────────────────────────────

export const setUserActiveSchema = z.object({
  id: userIdSchema,
  isActive: z.boolean(),
});

export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;
