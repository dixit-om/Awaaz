import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-layout';

// ─── Stat card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: React.ReactNode;
  accent: string;
}

function StatCard({ label, value, change, positive, icon, accent }: StatCardProps) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-[#64748b]">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[#0f172a]">{value}</p>
        {change && (
          <p
            className={`mt-1 text-xs font-medium ${positive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}
          >
            {change}
          </p>
        )}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
    </div>
  );
}

// ─── Platform health indicator ────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PageHeader
        title="Admin Overview"
        subtitle="Platform health, governance KPIs, and recent activity"
        breadcrumb={[{ label: 'Admin' }, { label: 'Overview' }]}
      />

      <div className="px-8 pb-12">
        {/* ── KPI grid ─── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Total Complaints"
            value="—"
            change="Connect API"
            icon={<FileText className="h-5 w-5 text-[#1e40af]" />}
            accent="bg-[#eff6ff]"
          />
          <StatCard
            label="Active Users"
            value="—"
            change="Connect API"
            icon={<Users className="h-5 w-5 text-[#7c3aed]" />}
            accent="bg-[#f5f3ff]"
          />
          <StatCard
            label="Resolution Rate"
            value="—"
            change="Connect API"
            positive
            icon={<CheckCircle2 className="h-5 w-5 text-[#22c55e]" />}
            accent="bg-[#f0fdf4]"
          />
          <StatCard
            label="Avg. Resolution Time"
            value="—"
            change="Connect API"
            icon={<Clock className="h-5 w-5 text-[#f59e0b]" />}
            accent="bg-[#fffbeb]"
          />
        </div>

        {/* ── Second row ─── */}
        <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Authorities"
            value="—"
            icon={<Shield className="h-5 w-5 text-[#0891b2]" />}
            accent="bg-[#ecfeff]"
          />
          <StatCard
            label="Pending Moderation"
            value="—"
            icon={<AlertCircle className="h-5 w-5 text-[#ef4444]" />}
            accent="bg-[#fef2f2]"
          />
          <StatCard
            label="Governance Score"
            value="—"
            icon={<TrendingUp className="h-5 w-5 text-[#1e40af]" />}
            accent="bg-[#eff6ff]"
          />
          <StatCard
            label="System Events (24h)"
            value="—"
            icon={<Activity className="h-5 w-5 text-[#64748b]" />}
            accent="bg-[#f8fafc]"
          />
        </div>

        {/* ── System health ─── */}
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
            <h2 className="mb-1 text-base font-semibold text-[#0f172a]">Recent Activity</h2>
            <p className="mb-4 text-xs text-[#94a3b8]">Last system events</p>
            <div className="flex h-40 items-center justify-center rounded-xl bg-[#f8fafc]">
              <p className="text-sm text-[#94a3b8]">Activity feed — connect API in Phase 8.2</p>
            </div>
          </div>
        </div>

        {/* ── Navigation hint ─── */}
        <div className="mt-8 rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-6">
          <p className="text-center text-sm text-[#94a3b8]">
            Use the sidebar to navigate: Users · Complaints · Media Moderation · Analytics ·
            Leaderboards · Constituencies · Authorities · Settings
          </p>
        </div>
      </div>
    </div>
  );
}
