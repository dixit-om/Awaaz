'use client';

import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';
import type { UserRole } from '@awaaz/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationItem } from '@/components/notifications/notification-item';
import { getNotificationsHref } from '@/lib/notifications';
import { useNotificationActions } from '@/hooks/use-notification-actions';
import { trpc } from '@/trpc/client';

interface NotificationWidgetProps {
  role: UserRole;
  title?: string;
  subtitle?: string;
  limit?: number;
}

export function NotificationWidget({
  role,
  title = 'Recent Notifications',
  subtitle = 'Latest updates from your account',
  limit = 5,
}: NotificationWidgetProps) {
  const { markAsRead } = useNotificationActions();
  const listQuery = trpc.notifications.list.useQuery(
    { page: 1, limit },
    { staleTime: 30_000, refetchInterval: 60_000 },
  );
  const notificationsHref = getNotificationsHref(role);
  const items = listQuery.data?.items ?? [];

  return (
    <Card padding="none">
      <CardHeader className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-0.5 text-xs text-[#94a3b8]">{subtitle}</p>
          </div>
          <Link href={notificationsHref}>
            <Button variant="ghost" size="sm" className="text-[#1e40af]">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      {listQuery.isLoading && (
        <div className="space-y-2 px-5 pb-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[#f1f5f9]" />
          ))}
        </div>
      )}

      {listQuery.isError && (
        <div className="px-5 pb-5">
          <p className="text-sm text-red-600">Could not load notifications.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void listQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
        <div className="px-5 pb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f5f9]">
            <Bell className="h-5 w-5 text-[#94a3b8]" />
          </div>
          <p className="mt-3 text-sm text-[#94a3b8]">No notifications yet.</p>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && items.length > 0 && (
        <div className="space-y-2 px-5 pb-5">
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              role={role}
              compact
              onMarkAsRead={(id) => markAsRead.mutate({ id })}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
