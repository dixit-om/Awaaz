'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Filter, MapPin, Plus, Search, X } from 'lucide-react';
import type { ComplaintPriority, ComplaintStatus } from '@awaaz/types';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/dashboard-layout';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatComplaintId,
  formatRelativeDate,
  isHighPriority,
} from '@/lib/complaints';
import { trpc } from '@/trpc/client';

const STATUS_TABS: { label: string; value?: ComplaintStatus }[] = [
  { label: 'All' },
  { label: 'Open', value: 'SUBMITTED' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const PRIORITY_TABS: { label: string; value?: ComplaintPriority }[] = [
  { label: 'All' },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

interface ComplaintsListViewProps {
  title: string;
  subtitle: string;
  breadcrumb: { label: string; href?: string }[];
  detailBasePath: string;
  showNewReport?: boolean;
}

export function ComplaintsListView({
  title,
  subtitle,
  breadcrumb,
  detailBasePath,
  showNewReport = false,
}: ComplaintsListViewProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | undefined>();

  const listQuery = trpc.complaints.listComplaints.useQuery(
    {
      page,
      limit: 10,
      status: statusFilter,
      priority: priorityFilter,
      search: debouncedSearch || undefined,
    },
    { staleTime: 15_000 },
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => setDebouncedSearch(value),
      400,
    );
  }

  const data = listQuery.data;
  const items = data?.items ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} breadcrumb={breadcrumb}>
        {showNewReport && (
          <Link href="/dashboard/report">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Report
            </Button>
          </Link>
        )}
      </PageHeader>

      <div className="px-8 pb-8">
        <div className="mb-5 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="search"
                placeholder="Search complaints…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-[#e2e8f0] bg-white pl-9 pr-9 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-[#94a3b8]" />
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-[#1e40af] text-white'
                    : 'border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#94a3b8]">Priority:</span>
            {PRIORITY_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => {
                  setPriorityFilter(tab.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  priorityFilter === tab.value
                    ? 'bg-[#1e40af] text-white'
                    : 'border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {listQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#f1f5f9]" />
            ))}
          </div>
        )}

        {listQuery.isError && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm font-medium text-[#0f172a]">Failed to load complaints</p>
            <p className="text-xs text-[#94a3b8]">{listQuery.error.message}</p>
            <Button size="sm" onClick={() => void listQuery.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm font-medium text-[#0f172a]">No complaints found</p>
            <p className="text-xs text-[#94a3b8]">
              {search || statusFilter || priorityFilter
                ? 'Try adjusting your filters'
                : 'No complaints have been filed yet'}
            </p>
          </div>
        )}

        {!listQuery.isLoading && !listQuery.isError && items.length > 0 && (
          <div className="space-y-3">
            {items.map((c) => (
              <Link key={c.id} href={`${detailBasePath}/${c.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[#94a3b8]">
                          {formatComplaintId(c.id)}
                        </span>
                        <Badge variant={statusToBadgeVariant(c.status)} dot>
                          {STATUS_LABELS[c.status]}
                        </Badge>
                        {isHighPriority(c.priority) && (
                          <Badge variant="urgent">{PRIORITY_LABELS[c.priority]}</Badge>
                        )}
                      </div>
                      <h3 className="truncate text-sm font-semibold text-[#0f172a]">{c.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#64748b]">
                        <span>
                          {c.category.icon} {c.category.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.location.address ?? 'Location pinned'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeDate(c.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {meta && meta.total > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-[#94a3b8]">
              Showing {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of{' '}
              {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-[#64748b]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
