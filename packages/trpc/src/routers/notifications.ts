import { z } from 'zod';
import type { NotificationService } from '@awaaz/notifications';
import { getNotificationsSchema, markAllAsReadSchema, markAsReadSchema } from '@awaaz/validation';
import { protectedProcedure, router } from '../server';

const updatePreferencesSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
  })
  .strip();

export function createNotificationsRouter(notificationService: NotificationService) {
  return router({
    /**
     * Paginated notification list for the calling user.
     * Supports filtering by unreadOnly + pagination (page / limit).
     * Ordered newest-first.
     */
    list: protectedProcedure.input(getNotificationsSchema).query(({ ctx, input }) => {
      return notificationService.getNotifications(ctx.user.id, input);
    }),

    /**
     * Returns the count of unread notifications for the calling user.
     * Used by the navbar bell badge — lightweight, no pagination needed.
     */
    unreadCount: protectedProcedure.query(({ ctx }) => {
      return notificationService.getUnreadCount(ctx.user.id);
    }),

    /**
     * Mark a single notification as read.
     * Returns 404 if the notification does not belong to the calling user.
     */
    markAsRead: protectedProcedure.input(markAsReadSchema).mutation(({ ctx, input }) => {
      return notificationService.markAsRead(ctx.user.id, input);
    }),

    /**
     * Mark ALL unread notifications as read for the calling user.
     * Returns the count of notifications that were updated.
     */
    markAllAsRead: protectedProcedure.input(markAllAsReadSchema).mutation(({ ctx }) => {
      return notificationService.markAllAsRead(ctx.user.id);
    }),

    /**
     * Returns notification channel preferences for the calling user.
     * Defaults to { inAppEnabled: true, pushEnabled: false, emailEnabled: false }
     * if the user has never updated their settings.
     */
    getPreferences: protectedProcedure.query(({ ctx }) => {
      return notificationService.getPreferences(ctx.user.id);
    }),

    /**
     * Updates notification channel preferences.
     * Partial update — only the fields provided in the body are changed.
     */
    updatePreferences: protectedProcedure
      .input(updatePreferencesSchema)
      .mutation(({ ctx, input }) => {
        return notificationService.updatePreferences(ctx.user.id, input);
      }),
  });
}
