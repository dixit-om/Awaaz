'use client';

import { useMemo } from 'react';
import type { UserRole } from '@awaaz/types';
import { ADMIN_NAV, CITIZEN_NAV, MLA_NAV, type NavItem } from '@/components/layout/sidebar';
import { getNotificationsHref, withNotificationBadge } from '@/lib/notifications';
import { trpc } from '@/trpc/client';

export function useNotificationNav(role: UserRole): NavItem[] {
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return useMemo(() => {
    const baseNav = role === 'mla' ? MLA_NAV : role === 'admin' ? ADMIN_NAV : CITIZEN_NAV;
    return withNotificationBadge(baseNav, getNotificationsHref(role), unreadQuery.data?.count);
  }, [role, unreadQuery.data?.count]);
}
