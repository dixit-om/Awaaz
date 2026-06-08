'use client';

import { use } from 'react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ComplaintDetailView } from '@/components/complaints/complaint-detail-view';
import { trpc } from '@/trpc/client';

export default function AdminComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = trpc.complaints.getComplaintById.useQuery({ id });

  if (query.isLoading) return <LoadingScreen message="Loading complaint…" />;

  if (query.isError || !query.data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-[#0f172a]">Complaint not found</p>
        <p className="text-xs text-[#94a3b8]">{query.error?.message}</p>
      </div>
    );
  }

  return (
    <ComplaintDetailView
      complaint={query.data}
      role="admin"
      backHref="/admin/complaints"
      backLabel="Back to All Complaints"
      onRefetch={() => void query.refetch()}
    />
  );
}
