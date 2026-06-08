'use client';

import { ComplaintsListView } from '@/components/complaints/complaints-list-view';

export default function AdminComplaintsPage() {
  return (
    <ComplaintsListView
      title="All Complaints"
      subtitle="Platform-wide complaint management"
      breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Complaints' }]}
      detailBasePath="/admin/complaints"
    />
  );
}
