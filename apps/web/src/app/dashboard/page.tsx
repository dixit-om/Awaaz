'use client';

import Link from 'next/link';
import { CheckCircle2, ChevronRight, FileText, MapPin, Plus, Star } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { useCurrentUser } from '@/contexts/auth-context';
import { STATUS_LABELS, formatComplaintId, formatRelativeDate } from '@/lib/complaints';
import { trpc } from '@/trpc/client';

export default function CitizenDashboard() {
  const user = useCurrentUser();
  const overviewQuery = trpc.analytics.getOverview.useQuery({}, { staleTime: 60_000 });
  const activeQuery = trpc.complaints.listComplaints.useQuery(
    { page: 1, limit: 5, status: 'IN_PROGRESS' },
    { staleTime: 30_000 },
  );
  const openQuery = trpc.complaints.listComplaints.useQuery(
    {
      page: 1,
      limit: 5,
      status: 'SUBMITTED',
    },
    { staleTime: 30_000 },
  );

  const overview = overviewQuery.data;
  const activeItems = [...(activeQuery.data?.items ?? []), ...(openQuery.data?.items ?? [])].slice(
    0,
    4,
  );

  return (
    <div className="max-w-[1200px] px-8 py-8">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#dbeafe_0%,_transparent_60%)]" />
        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a]">
              Hello, {user?.name?.split(' ')[0] ?? 'Citizen'}.
            </h1>
            <p className="mt-1 max-w-md text-sm text-[#64748b]">
              Track your civic reports and see how your community is improving.
            </p>
          </div>
          <Avatar name={user?.name ?? 'Citizen'} size="lg" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Complaints"
          value={overviewQuery.isLoading ? '…' : String(overview?.totalComplaints ?? 0)}
          sub="All time"
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-[#1e40af]"
        />
        <StatCard
          label="Open"
          value={overviewQuery.isLoading ? '…' : String(overview?.openComplaints ?? 0)}
          sub="Awaiting action"
          icon={FileText}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Resolved"
          value={overviewQuery.isLoading ? '…' : String(overview?.resolvedComplaints ?? 0)}
          sub={`${overview?.resolutionRate?.toFixed(0) ?? 0}% rate`}
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          label="Reputation"
          value={String(user?.reputationScore ?? 0)}
          sub="Impact points"
          icon={Star}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card padding="none">
            <div className="flex items-center justify-between px-5 pb-0 pt-5">
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">My Active Reports</h2>
                <p className="mt-0.5 text-xs text-[#94a3b8]">
                  Complaints you&apos;ve filed that are in progress
                </p>
              </div>
              <Link href="/dashboard/complaints">
                <Button variant="ghost" size="sm" className="text-[#1e40af]">
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {(activeQuery.isLoading || openQuery.isLoading) && (
              <div className="space-y-2 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-[#f1f5f9]" />
                ))}
              </div>
            )}

            {!activeQuery.isLoading && activeItems.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-[#94a3b8]">
                  No active reports. File your first complaint!
                </p>
                <Link href="/dashboard/report">
                  <Button size="sm" className="mt-3">
                    <Plus className="h-4 w-4" />
                    Report Issue
                  </Button>
                </Link>
              </div>
            )}

            <div className="mt-4 divide-y divide-[#f1f5f9]">
              {activeItems.map((report) => (
                <Link key={report.id} href={`/dashboard/complaints/${report.id}`}>
                  <div className="flex gap-4 px-5 py-4 transition-colors hover:bg-[#f8fafc]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-xl">
                      {report.category.icon ?? '📋'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[#0f172a]">
                          {report.title}
                        </p>
                        <Badge
                          variant={statusToBadgeVariant(report.status)}
                          className="shrink-0 text-[10px]"
                        >
                          {STATUS_LABELS[report.status]}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-[#94a3b8]" />
                        <span className="truncate text-xs text-[#94a3b8]">
                          {report.location.address ?? formatComplaintId(report.id)}
                        </span>
                        <span className="text-[#e2e8f0]">·</span>
                        <span className="whitespace-nowrap text-xs text-[#94a3b8]">
                          {formatRelativeDate(report.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-[#0f172a]">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <Link href="/dashboard/report">
                <Button className="w-full">
                  <Plus className="h-4 w-4" />
                  Report New Issue
                </Button>
              </Link>
              <Link href="/dashboard/complaints">
                <Button variant="outline" className="w-full">
                  View My Complaints
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
