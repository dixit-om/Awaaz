'use client';

import { NotificationsPageContent } from '@/components/notifications/notifications-page-content';

export default function AdminNotificationsPage() {
  return (
    <NotificationsPageContent
      role="admin"
      breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Notifications' }]}
    />
  );
}
