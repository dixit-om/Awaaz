'use client';

import { trpc } from '@/trpc/client';

export function useNotificationActions() {
  const utils = trpc.useUtils();

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onMutate: async ({ id }) => {
      await utils.notifications.list.cancel();
      await utils.notifications.unreadCount.cancel();

      const previousCount = utils.notifications.unreadCount.getData();

      utils.notifications.list.setData({ page: 1, limit: 20 }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === id ? { ...item, isRead: true, readAt: new Date() } : item,
          ),
        };
      });

      utils.notifications.unreadCount.setData(undefined, (old) => ({
        count: Math.max(0, (old?.count ?? 1) - 1),
      }));

      return { previousCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousCount) {
        utils.notifications.unreadCount.setData(undefined, ctx.previousCount);
      }
    },
    onSettled: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation({
    onMutate: async () => {
      await utils.notifications.list.cancel();
      await utils.notifications.unreadCount.cancel();

      utils.notifications.unreadCount.setData(undefined, { count: 0 });
      utils.notifications.list.setData({ page: 1, limit: 20 }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) => ({ ...item, isRead: true, readAt: new Date() })),
        };
      });
    },
    onSettled: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
  });

  return { markAsRead, markAllAsRead };
}
