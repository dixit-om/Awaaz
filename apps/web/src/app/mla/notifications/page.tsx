'use client';

import { NotificationsPageContent } from '@/components/notifications/notifications-page-content';

export default function MLANotificationsPage() {
  return (
    <NotificationsPageContent
      role="mla"
      breadcrumb={[{ label: 'Dashboard', href: '/mla' }, { label: 'Notifications' }]}
    />
  );
}
