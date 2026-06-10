'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import type { UserRole } from '@awaaz/types';
import { NotificationBadge } from '@/components/notifications/notification-badge';
import { getNotificationsHref } from '@/lib/notifications';
import { trpc } from '@/trpc/client';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  role: UserRole;
  className?: string;
}

export function NotificationBell({ role, className }: NotificationBellProps) {
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const count = unreadQuery.data?.count ?? 0;
  const href = getNotificationsHref(role);

  return (
    <Link
      href={href}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] transition-colors hover:border-[#cbd5e1] hover:text-[#1e40af]',
        className,
      )}
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1">
          <NotificationBadge count={count} />
        </span>
      )}
    </Link>
  );
}
