'use client';

import { ComplaintsListView } from '@/components/complaints/complaints-list-view';

export default function ComplaintsPage() {
  return (
    <ComplaintsListView
      title="My Complaints"
      subtitle="All your filed civic issues"
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Complaints' }]}
      detailBasePath="/dashboard/complaints"
      showNewReport
    />
  );
}
