'use client';

import { useEffect, useState } from 'react';
import type { NotificationItem, UserRole } from '@awaaz/types';
import { PageHeader } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { NotificationList } from '@/components/notifications/notification-list';
import { useNotificationActions } from '@/hooks/use-notification-actions';
import { trpc } from '@/trpc/client';

const PAGE_SIZE = 20;

interface NotificationsPageContentProps {
  role: UserRole;
  breadcrumb: { label: string; href?: string }[];
}

export function NotificationsPageContent({ role, breadcrumb }: NotificationsPageContentProps) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const { markAsRead, markAllAsRead } = useNotificationActions();

  const listQuery = trpc.notifications.list.useQuery(
    { page, limit: PAGE_SIZE },
    { staleTime: 15_000, refetchInterval: 60_000 },
  );
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!listQuery.data) return;
    setItems((current) => {
      if (page === 1) return listQuery.data.items;
      const existingIds = new Set(current.map((item) => item.id));
      const nextItems = listQuery.data.items.filter((item) => !existingIds.has(item.id));
      return [...current, ...nextItems];
    });
  }, [listQuery.data, page]);

  const total = listQuery.data?.total ?? 0;
  const unreadCount = unreadQuery.data?.count ?? 0;
  const hasMore = items.length < total;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
            : 'You are all caught up'
        }
        breadcrumb={breadcrumb}
      >
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            loading={markAllAsRead.isPending}
            onClick={() => {
              markAllAsRead.mutate({});
              setItems((current) =>
                current.map((item) => ({ ...item, isRead: true, readAt: new Date() })),
              );
            }}
          >
            Mark all as read
          </Button>
        )}
      </PageHeader>

      <div className="max-w-3xl space-y-6 px-8 pb-8">
        <NotificationList
          items={items}
          role={role}
          isLoading={listQuery.isLoading && page === 1}
          isError={listQuery.isError}
          onRetry={() => void listQuery.refetch()}
          onMarkAsRead={(id) => {
            markAsRead.mutate({ id });
            setItems((current) =>
              current.map((item) =>
                item.id === id ? { ...item, isRead: true, readAt: new Date() } : item,
              ),
            );
          }}
          hasMore={hasMore}
          isLoadingMore={listQuery.isFetching && page > 1}
          onLoadMore={() => setPage((current) => current + 1)}
        />
      </div>
    </div>
  );
}
