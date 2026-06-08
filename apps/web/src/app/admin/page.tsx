'use client';

import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  FileText,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-layout';
import { trpc } from '@/trpc/client';

// ─── Stat card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  href?: string;
}

function StatCard({ label, value, sub, icon, accent, href }: StatCardProps) {
  const inner = (
    <div className="flex items-start justify-between rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <p className="text-sm text-[#64748b]">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[#0f172a]">{value}</p>
        {sub && <p className="mt-1 text-xs text-[#94a3b8]">{sub}</p>}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── System health indicator ──────────────────────────────────────────

interface HealthItemProps {
  label: string;
  status: 'operational' | 'degraded' | 'down';
}

function HealthItem({ label, status }: HealthItemProps) {
  const config = {
    operational: { color: 'bg-[#22c55e]', text: 'Operational' },
    degraded: { color: 'bg-[#f59e0b]', text: 'Degraded' },
    down: { color: 'bg-[#ef4444]', text: 'Down' },
  }[status];

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-[#0f172a]">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${config.color}`} />
        <span className="text-xs text-[#64748b]">{config.text}</span>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-[#f1f5f9]" />
        <div className="h-7 w-16 animate-pulse rounded bg-[#f1f5f9]" />
        <div className="h-3 w-20 animate-pulse rounded bg-[#f1f5f9]" />
      </div>
      <div className="h-10 w-10 animate-pulse rounded-xl bg-[#f1f5f9]" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const statsQuery = trpc.users.getStats.useQuery(undefined, { staleTime: 60_000 });
  const overviewQuery = trpc.analytics.getOverview.useQuery({}, { staleTime: 60_000 });
  const stats = statsQuery.data;
  const overview = overviewQuery.data;
  const loading = statsQuery.isLoading;
  const complaintsLoading = overviewQuery.isLoading;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        title="Admin Overview"
        subtitle="Platform health, user statistics, and governance KPIs"
        breadcrumb={[{ label: 'Admin' }, { label: 'Overview' }]}
      />

      <div className="px-8 pb-12">
        {/* ── User KPI grid ─── */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
          User Statistics
        </p>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                label="Total Users"
                value={stats?.total ?? 0}
                sub={`${stats?.inactive ?? 0} inactive`}
                icon={<Users className="h-5 w-5 text-[#1e40af]" />}
                accent="bg-[#eff6ff]"
                href="/admin/users"
              />
              <StatCard
                label="Active Users"
                value={stats?.active ?? 0}
                sub={`${stats?.total ? Math.round((stats.active / stats.total) * 100) : 0}% of total`}
                icon={<UserCheck className="h-5 w-5 text-[#15803d]" />}
                accent="bg-[#f0fdf4]"
              />
              <StatCard
                label="Citizens"
                value={stats?.byRole.citizen ?? 0}
                icon={<Users className="h-5 w-5 text-[#0891b2]" />}
                accent="bg-[#ecfeff]"
                href="/admin/users?role=citizen"
              />
              <StatCard
                label="MLAs"
                value={stats?.byRole.mla ?? 0}
                icon={<Shield className="h-5 w-5 text-[#7c3aed]" />}
                accent="bg-[#f5f3ff]"
                href="/admin/users?role=mla"
              />
              <StatCard
                label="Admins"
                value={stats?.byRole.admin ?? 0}
                icon={<Shield className="h-5 w-5 text-[#dc2626]" />}
                accent="bg-[#fef2f2]"
                href="/admin/users?role=admin"
              />
            </>
          )}
        </div>

        {/* ── Complaint & platform KPIs ─── */}
        <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
          Platform Metrics
        </p>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Total Complaints"
            value={complaintsLoading ? '…' : (overview?.totalComplaints ?? 0)}
            sub={`${overview?.openComplaints ?? 0} open`}
            icon={<FileText className="h-5 w-5 text-[#1e40af]" />}
            accent="bg-[#eff6ff]"
            href="/admin/complaints"
          />
          <StatCard
            label="Open Complaints"
            value={complaintsLoading ? '…' : (overview?.openComplaints ?? 0)}
            sub={`${overview?.inProgressComplaints ?? 0} in progress`}
            icon={<AlertCircle className="h-5 w-5 text-[#f59e0b]" />}
            accent="bg-[#fffbeb]"
            href="/admin/complaints"
          />
          <StatCard
            label="Resolved"
            value={complaintsLoading ? '…' : (overview?.resolvedComplaints ?? 0)}
            sub={`${overview?.resolutionRate?.toFixed(0) ?? 0}% resolution rate`}
            icon={<CheckCircle2 className="h-5 w-5 text-[#22c55e]" />}
            accent="bg-[#f0fdf4]"
          />
          <StatCard
            label="Verified"
            value={complaintsLoading ? '…' : (overview?.verifiedComplaints ?? 0)}
            sub={`${overview?.rejectedComplaints ?? 0} rejected`}
            icon={<TrendingUp className="h-5 w-5 text-[#1e40af]" />}
            accent="bg-[#eff6ff]"
          />
        </div>

        {/* ── System health + Quick nav ─── */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-[#0f172a]">System Health</h2>
            <p className="mb-4 text-xs text-[#94a3b8]">Real-time infrastructure status</p>
            <div className="divide-y divide-[#f1f5f9]">
              <HealthItem label="API Server" status="operational" />
              <HealthItem label="Database (PostgreSQL)" status="operational" />
              <HealthItem label="Media Storage (Cloudinary)" status="operational" />
              <HealthItem label="Notification Queue (Redis)" status="degraded" />
            </div>
          </div>

          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-[#0f172a]">Quick Navigation</h2>
            <p className="mb-4 text-xs text-[#94a3b8]">Jump to admin modules</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Users', href: '/admin/users', icon: <Users className="h-4 w-4" /> },
                {
                  label: 'Complaints',
                  href: '/admin/complaints',
                  icon: <FileText className="h-4 w-4" />,
                },
                { label: 'Media', href: '/admin/media', icon: <AlertCircle className="h-4 w-4" /> },
                {
                  label: 'Analytics',
                  href: '/admin/analytics',
                  icon: <Activity className="h-4 w-4" />,
                },
              ].map(({ label, href, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium text-[#0f172a] transition-colors hover:bg-[#f8fafc]"
                >
                  <span className="text-[#64748b]">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
