'use client';

import { Bell } from 'lucide-react';
import type { NotificationItem as NotificationItemType, UserRole } from '@awaaz/types';
import { Button } from '@/components/ui/button';
import { NotificationItem } from '@/components/notifications/notification-item';
import { groupNotificationsByDate } from '@/lib/notifications';

function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-[#e2e8f0] bg-white" />
      ))}
    </div>
  );
}

interface NotificationListProps {
  items: NotificationItemType[];
  role: UserRole;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onMarkAsRead?: (id: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function NotificationList({
  items,
  role,
  isLoading,
  isError,
  onRetry,
  onMarkAsRead,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: NotificationListProps) {
  if (isLoading) {
    return <NotificationSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-red-700">Could not load notifications.</p>
        <p className="mt-1 text-xs text-red-600">Please check your connection and try again.</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f5f9]">
          <Bell className="h-7 w-7 text-[#94a3b8]" />
        </div>
        <p className="mt-4 text-sm font-medium text-[#0f172a]">No notifications yet</p>
        <p className="mt-1 text-xs text-[#64748b]">
          Updates about your complaints and assignments will appear here.
        </p>
      </div>
    );
  }

  const groups = groupNotificationsByDate(items);

  return (
    <div className="space-y-6">
      {(Object.entries(groups) as [keyof typeof groups, NotificationItemType[]][]).map(
        ([group, groupItems]) =>
          groupItems.length > 0 ? (
            <div key={group}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                {group}
              </p>
              <div className="space-y-2">
                {groupItems.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    role={role}
                    onMarkAsRead={onMarkAsRead}
                  />
                ))}
              </div>
            </div>
          ) : null,
      )}

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" loading={isLoadingMore} onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
