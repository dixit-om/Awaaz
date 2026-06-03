import { z } from 'zod';
import { cuidSchema } from './complaints';

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------

export const getNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  /** When true, return only unread notifications */
  unreadOnly: z.boolean().optional(),
});

export type GetNotificationsSchema = z.infer<typeof getNotificationsSchema>;

// ---------------------------------------------------------------------------
// markAsRead
// ---------------------------------------------------------------------------

export const markAsReadSchema = z.object({
  id: cuidSchema,
});

export type MarkAsReadSchema = z.infer<typeof markAsReadSchema>;

// ---------------------------------------------------------------------------
// markAllAsRead  (no input — scoped to the calling user)
// ---------------------------------------------------------------------------

export const markAllAsReadSchema = z.object({}).strict();

export type MarkAllAsReadSchema = z.infer<typeof markAllAsReadSchema>;
