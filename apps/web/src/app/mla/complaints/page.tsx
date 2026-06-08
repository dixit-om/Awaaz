'use client';

import { ComplaintsListView } from '@/components/complaints/complaints-list-view';

export default function MLAComplaintsPage() {
  return (
    <ComplaintsListView
      title="Assigned Complaints"
      subtitle="Complaints assigned to your constituency"
      breadcrumb={[{ label: 'Dashboard', href: '/mla' }, { label: 'Assigned Complaints' }]}
      detailBasePath="/mla/complaints"
    />
  );
}
