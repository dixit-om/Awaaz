import { TrendingUp, Target, Clock, CheckCircle2, Award } from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

const MONTHLY = [
  { month: 'Jan', filed: 48, resolved: 32, sla: 65 },
  { month: 'Feb', filed: 52, resolved: 41, sla: 79 },
  { month: 'Mar', filed: 45, resolved: 43, sla: 96 },
  { month: 'Apr', filed: 58, resolved: 49, sla: 84 },
  { month: 'May', filed: 51, resolved: 47, sla: 92 },
  { month: 'Jun', filed: 42, resolved: 38, sla: 90 },
];

const CATEGORIES = [
  { name: 'Road Issues', count: 58, pct: 34, color: 'bg-blue-500' },
  { name: 'Water Problems', count: 42, pct: 25, color: 'bg-cyan-500' },
  { name: 'Garbage', count: 31, pct: 18, color: 'bg-orange-500' },
  { name: 'Electricity', count: 22, pct: 13, color: 'bg-yellow-500' },
  { name: 'Drainage', count: 17, pct: 10, color: 'bg-teal-500' },
];

const MAX_BAR = 58;

export default function MLAAnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Bengaluru Central Constituency — Performance insights"
        breadcrumb={[{ label: 'Dashboard', href: '/mla' }, { label: 'Analytics' }]}
      />

      <div className="space-y-6 px-8 pb-8">
        {/* KPI Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Assigned"
            value="312"
            icon={TrendingUp}
            iconBg="bg-blue-50"
            iconColor="text-[#1e40af]"
            trend={{ value: '8%', up: true }}
          />
          <StatCard
            label="Resolved"
            value="274"
            icon={CheckCircle2}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            trend={{ value: '12%', up: true }}
          />
          <StatCard
            label="SLA Compliance"
            value="88%"
            icon={Target}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            trend={{ value: '4%', up: true }}
          />
          <StatCard
            label="Avg Resolution"
            value="4.2d"
            icon={Clock}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            trend={{ value: '0.5d', up: true }}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
          {/* Monthly chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Filed vs Resolved</CardTitle>
            </CardHeader>
            <div className="mb-4 flex h-40 items-end justify-between gap-2">
              {MONTHLY.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end gap-1" style={{ height: '128px' }}>
                    <div
                      className="flex-1 rounded-t-md bg-[#dbeafe]"
                      style={{ height: `${(m.filed / MAX_BAR) * 128}px` }}
                    />
                    <div
                      className="flex-1 rounded-t-md bg-[#1e40af]"
                      style={{ height: `${(m.resolved / MAX_BAR) * 128}px` }}
                    />
                  </div>
                  <span className="text-[9px] text-[#94a3b8]">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-5">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-[#dbeafe]" />
                <span className="text-xs text-[#64748b]">Filed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-[#1e40af]" />
                <span className="text-xs text-[#64748b]">Resolved</span>
              </div>
            </div>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-[#64748b]">{cat.name}</span>
                    <span className="text-xs font-semibold text-[#0f172a]">{cat.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className={`h-full ${cat.color} rounded-full`}
                      style={{ width: `${cat.pct * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* SLA Compliance monthly */}
        <Card>
          <CardHeader>
            <CardTitle>SLA Compliance Trend</CardTitle>
          </CardHeader>
          <p className="-mt-3 mb-4 text-xs text-[#94a3b8]">
            % of complaints resolved within 7-day target
          </p>
          <div className="flex h-24 items-end justify-between gap-2">
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-md transition-all ${m.sla >= 90 ? 'bg-green-400' : m.sla >= 75 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ height: `${(m.sla / 100) * 80}px` }}
                />
                <span className="text-[9px] text-[#94a3b8]">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-5">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-green-400" />
              <span className="text-xs text-[#64748b]">≥90% (On Track)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-amber-400" />
              <span className="text-xs text-[#64748b]">75–90% (Warning)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-red-400" />
              <span className="text-xs text-[#64748b]">&lt;75% (Breach)</span>
            </div>
          </div>
        </Card>

        {/* Comparison with peers */}
        <Card>
          <CardHeader>
            <CardTitle>Benchmark Comparison</CardTitle>
            <div className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-[#0f172a]">Rank #12 of 94 MLAs</span>
            </div>
          </CardHeader>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Your Score', value: '8.4/10', sub: 'Governance Score', highlight: true },
              {
                label: 'State Average',
                value: '6.9/10',
                sub: 'Avg across all MLAs',
                highlight: false,
              },
              { label: 'Top MLA', value: '9.6/10', sub: 'Benchmark target', highlight: false },
            ].map((row) => (
              <div
                key={row.label}
                className={`rounded-xl border p-4 text-center ${row.highlight ? 'border-blue-100 bg-blue-50' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}
              >
                <p
                  className={`text-2xl font-bold ${row.highlight ? 'text-[#1e40af]' : 'text-[#0f172a]'}`}
                >
                  {row.value}
                </p>
                <p className="mt-1 text-xs font-medium text-[#0f172a]">{row.label}</p>
                <p className="mt-0.5 text-[10px] text-[#94a3b8]">{row.sub}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
