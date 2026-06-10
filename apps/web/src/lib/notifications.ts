import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Bell, CheckCircle2, FileText, Info, Megaphone, Users } from 'lucide-react';
import type { NotificationItem, NotificationType, UserRole } from '@awaaz/types';
import { formatDate } from '@/lib/utils';

export type NotificationIconConfig = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

export type NotificationAction = {
  label: string;
  href: string;
};

const NOTIFICATION_ICONS: Record<NotificationType, NotificationIconConfig> = {
  COMPLAINT_CREATED: {
    icon: FileText,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#1e40af]',
  },
  COMPLAINT_ASSIGNED: {
    icon: Users,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#1e40af]',
  },
  COMPLAINT_STATUS_UPDATED: {
    icon: Info,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  COMPLAINT_RESOLVED: {
    icon: CheckCircle2,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  COMPLAINT_VERIFIED: {
    icon: CheckCircle2,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  COMPLAINT_REJECTED: {
    icon: AlertTriangle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
  },
  SYSTEM_ANNOUNCEMENT: {
    icon: Megaphone,
    iconBg: 'bg-slate-50',
    iconColor: 'text-[#64748b]',
  },
};

export function getNotificationIcon(type: NotificationType): NotificationIconConfig {
  return (
    NOTIFICATION_ICONS[type] ?? { icon: Bell, iconBg: 'bg-slate-50', iconColor: 'text-[#64748b]' }
  );
}

export function getComplaintHref(role: UserRole, complaintId: string): string {
  if (role === 'mla') return `/mla/complaints/${complaintId}`;
  if (role === 'admin') return `/admin/complaints/${complaintId}`;
  return `/dashboard/complaints/${complaintId}`;
}

export function getNotificationsHref(role: UserRole): string {
  if (role === 'mla') return '/mla/notifications';
  if (role === 'admin') return '/admin/notifications';
  return '/dashboard/notifications';
}

export function getNotificationAction(
  notification: NotificationItem,
  role: UserRole,
): NotificationAction | null {
  const complaintId =
    typeof notification.metadata.complaintId === 'string'
      ? notification.metadata.complaintId
      : null;

  if (!complaintId) return null;

  const href = getComplaintHref(role, complaintId);

  switch (notification.type) {
    case 'COMPLAINT_CREATED':
      return { label: 'Track', href };
    case 'COMPLAINT_ASSIGNED':
      return { label: 'Review', href };
    case 'COMPLAINT_STATUS_UPDATED':
      return { label: 'Track', href };
    case 'COMPLAINT_RESOLVED':
      return { label: role === 'citizen' ? 'Verify Now' : 'View', href };
    case 'COMPLAINT_VERIFIED':
    case 'COMPLAINT_REJECTED':
      return { label: 'View', href };
    default:
      return null;
  }
}

export function formatNotificationTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (d >= startOfToday) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (d >= startOfYesterday && d < startOfToday) return 'Yesterday';
  return formatDate(d);
}

export type NotificationGroupKey = 'Today' | 'Yesterday' | 'Earlier';

export function groupNotificationsByDate(
  items: NotificationItem[],
): Record<NotificationGroupKey, NotificationItem[]> {
  const groups: Record<NotificationGroupKey, NotificationItem[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  for (const item of items) {
    const created = new Date(item.createdAt);
    if (created >= startOfToday) {
      groups.Today.push(item);
    } else if (created >= startOfYesterday) {
      groups.Yesterday.push(item);
    } else {
      groups.Earlier.push(item);
    }
  }

  return groups;
}

export function withNotificationBadge<T extends { href: string; badge?: number }>(
  nav: T[],
  notificationsHref: string,
  count: number | undefined,
): T[] {
  if (!count || count <= 0) return nav;
  return nav.map((item) => (item.href === notificationsHref ? { ...item, badge: count } : item));
}
