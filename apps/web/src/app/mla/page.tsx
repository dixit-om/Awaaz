'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, FileText, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/contexts/auth-context';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatComplaintId,
  formatRelativeDate,
  isHighPriority,
} from '@/lib/complaints';
import { trpc } from '@/trpc/client';

export default function MLADashboard() {
  const user = useCurrentUser();
  const overviewQuery = trpc.analytics.getOverview.useQuery({}, { staleTime: 60_000 });
  const metricsQuery = trpc.analytics.getComplaintMetrics.useQuery({}, { staleTime: 60_000 });
  const urgentQuery = trpc.complaints.listComplaints.useQuery(
    { page: 1, limit: 5, priority: 'URGENT' },
    { staleTime: 30_000 },
  );

  const overview = overviewQuery.data;
  const metrics = metricsQuery.data;

  return (
    <div className="max-w-[1200px] px-8 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs text-[#94a3b8]">AWAAZ GovTech › Dashboard</p>
          <h1 className="text-2xl font-bold text-[#0f172a]">Authority Overview</h1>
          <p className="mt-1 text-sm text-[#64748b]">Welcome back, {user?.name ?? 'Authority'}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Assigned"
          value={overviewQuery.isLoading ? '…' : String(overview?.totalComplaints ?? 0)}
          sub="All complaints"
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-[#1e40af]"
        />
        <StatCard
          label="Open Issues"
          value={overviewQuery.isLoading ? '…' : String(overview?.openComplaints ?? 0)}
          sub="Needs attention"
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Resolved"
          value={overviewQuery.isLoading ? '…' : String(overview?.resolvedComplaints ?? 0)}
          sub={`${overview?.resolutionRate?.toFixed(0) ?? 0}% resolution rate`}
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          label="Avg. Resolution"
          value={
            metricsQuery.isLoading
              ? '…'
              : metrics?.avgResolutionTimeHours
                ? `${metrics.avgResolutionTimeHours.toFixed(1)}h`
                : '—'
          }
          sub="Mean time to resolve"
          icon={Clock}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      <Card padding="none">
        <CardHeader className="px-5 pt-5">
          <div className="flex items-center justify-between">
            <CardTitle>Urgent Complaints</CardTitle>
            <Link href="/mla/complaints">
              <Button variant="ghost" size="sm" className="text-[#1e40af]">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>

        {urgentQuery.isLoading && (
          <div className="space-y-2 px-5 pb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f1f5f9]" />
            ))}
          </div>
        )}

        {!urgentQuery.isLoading && (urgentQuery.data?.items.length ?? 0) === 0 && (
          <p className="px-5 pb-5 text-sm text-[#94a3b8]">No urgent complaints right now.</p>
        )}

        <div className="divide-y divide-[#f1f5f9]">
          {urgentQuery.data?.items.map((c) => (
            <Link key={c.id} href={`/mla/complaints/${c.id}`}>
              <div className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#f8fafc]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#94a3b8]">
                      {formatComplaintId(c.id)}
                    </span>
                    {isHighPriority(c.priority) && (
                      <Badge variant="urgent">{PRIORITY_LABELS[c.priority]}</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium text-[#0f172a]">{c.title}</p>
                  <p className="text-xs text-[#94a3b8]">{formatRelativeDate(c.createdAt)}</p>
                </div>
                <Badge variant={statusToBadgeVariant(c.status)}>{STATUS_LABELS[c.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#1e40af]" />
          <h3 className="text-sm font-semibold text-[#0f172a]">Resolution Rate</h3>
        </div>
        <p className="mt-2 text-3xl font-bold text-[#0f172a]">
          {overviewQuery.isLoading ? '…' : `${overview?.resolutionRate?.toFixed(1) ?? 0}%`}
        </p>
        <p className="mt-1 text-xs text-[#94a3b8]">
          {overview?.verifiedComplaints ?? 0} verified · {overview?.rejectedComplaints ?? 0}{' '}
          rejected
        </p>
      </div>
    </div>
  );
}
