'use client';

import Link from 'next/link';
import type { NotificationItem as NotificationItemType, UserRole } from '@awaaz/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  formatNotificationTime,
  getNotificationAction,
  getNotificationIcon,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: NotificationItemType;
  role: UserRole;
  onMarkAsRead?: (id: string) => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  role,
  onMarkAsRead,
  compact = false,
}: NotificationItemProps) {
  const { icon: Icon, iconBg, iconColor } = getNotificationIcon(notification.type);
  const action = getNotificationAction(notification, role);

  function handleOpen() {
    if (!notification.isRead) {
      onMarkAsRead?.(notification.id);
    }
  }

  return (
    <Card
      padding="sm"
      className={cn(
        'transition-colors',
        !notification.isRead && 'border-l-[3px] border-l-[#1e40af]',
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl',
            iconBg,
          )}
        >
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm leading-snug',
                  !notification.isRead ? 'font-semibold text-[#0f172a]' : 'text-[#0f172a]',
                )}
              >
                {notification.title}
              </p>
              {!compact && <p className="mt-0.5 text-xs text-[#64748b]">{notification.message}</p>}
            </div>
            <span className="whitespace-nowrap text-[10px] text-[#94a3b8]">
              {formatNotificationTime(notification.createdAt)}
            </span>
          </div>

          {compact && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#64748b]">{notification.message}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {action && (
              <Link href={action.href} onClick={handleOpen}>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#1e40af]">
                  {action.label} →
                </Button>
              </Link>
            )}
            {!notification.isRead && (
              <button
                type="button"
                onClick={() => onMarkAsRead?.(notification.id)}
                className="text-xs font-medium text-[#64748b] underline hover:text-[#0f172a]"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
        {!notification.isRead && (
          <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#1e40af]" />
        )}
      </div>
    </Card>
  );
}
