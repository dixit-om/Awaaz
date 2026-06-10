'use client';

import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#1e40af] px-1.5 py-0.5 text-center text-[10px] font-bold text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
