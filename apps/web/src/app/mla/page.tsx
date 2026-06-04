import Link from 'next/link';
import { AlertTriangle, Clock, CheckCircle2, TrendingUp, MapPin, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

/* ─── Mock Data ─────────────────────────────────────────────────────── */
const URGENT_COMPLAINTS = [
  {
    id: '#BZ-492',
    category: 'Water Leakage (Main)',
    location: 'Indiranagar 100ft Rd',
    status: 'SUBMITTED',
    daysOld: 5,
    priority: 'urgent',
  },
  {
    id: '#BZ-488',
    category: 'Streetlight Failure',
    location: 'MG Road Junction',
    status: 'IN_PROGRESS',
    daysOld: 3,
    priority: 'normal',
  },
  {
    id: '#BZ-475',
    category: 'Pothole Cluster',
    location: 'Koramangala 4th Blk',
    status: 'SUBMITTED',
    daysOld: 4,
    priority: 'urgent',
  },
  {
    id: '#BZ-460',
    category: 'Garbage Accumulation',
    location: 'Ulsoor Lake Belt',
    status: 'IN_PROGRESS',
    daysOld: 6,
    priority: 'normal',
  },
];

const MONTHLY_TREND = [
  { month: 'Jan', filed: 48, resolved: 32 },
  { month: 'Feb', filed: 52, resolved: 41 },
  { month: 'Mar', filed: 45, resolved: 43 },
  { month: 'Apr', filed: 58, resolved: 49 },
  { month: 'May', filed: 51, resolved: 47 },
  { month: 'Jun', filed: 42, resolved: 38 },
];

const MAX_BAR = 58;

export default function MLADashboard() {
  return (
    <div className="max-w-[1200px] px-8 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs text-[#94a3b8]">AWAAZ GovTech › Dashboard</p>
          <h1 className="text-2xl font-bold text-[#0f172a]">Authority Overview</h1>
        </div>
        <div className="flex gap-4">
          <div className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-center shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
              Constituency
            </p>
            <p className="mt-0.5 text-sm font-bold text-[#0f172a]">Bengaluru Central</p>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-center shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
              Governance Score
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <p className="text-sm font-bold text-[#0f172a]">8.4/10</p>
              <span className="flex items-center gap-0.5 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" /> 0.2
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Open Issues"
          value="142"
          sub="-12 this week"
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          trend={{ value: '12', up: false }}
        />
        <StatCard
          label="Avg. Resolution Time"
          value="4.2 days"
          sub="↓ 0.5d vs last month"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          trend={{ value: '0.5d faster', up: true }}
        />
        <StatCard
          label="Public Verification Rate"
          value="88%"
          sub="Citizens confirming resolved"
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          trend={{ value: '3%', up: true }}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Left — Urgent Attention table */}
        <Card padding="none">
          <div className="flex items-center justify-between px-5 pb-0 pt-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2 className="text-base font-semibold text-[#0f172a]">Urgent Attention</h2>
            </div>
            <Link href="/mla/complaints">
              <Button variant="ghost" size="sm" className="text-[#1e40af]">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  {['Issue ID', 'Category', 'Location', 'Status', 'Action'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {URGENT_COMPLAINTS.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-[#f8fafc] transition-colors hover:bg-[#f8fafc] ${c.daysOld >= 5 ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#0f172a]">{c.id}</p>
                        {c.daysOld >= 5 && (
                          <p className="text-[10px] font-medium text-red-500">
                            {c.daysOld}d — SLA Risk
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#0f172a]">{c.category}</td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1 text-xs text-[#64748b]">
                        <MapPin className="h-3 w-3" />
                        {c.location}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusToBadgeVariant(c.status)} dot>
                        {c.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {c.status === 'SUBMITTED' ? (
                        <Button size="sm" className="h-7 px-3 text-xs">
                          Assign
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
                          Update
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Resolution Trend chart */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Trend</CardTitle>
            </CardHeader>
            <p className="-mt-3 mb-4 text-xs text-[#94a3b8]">Monthly volume (Last 6 mos)</p>
            {/* Simple bar chart */}
            <div className="flex h-28 items-end justify-between gap-1">
              {MONTHLY_TREND.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end gap-0.5" style={{ height: '88px' }}>
                    <div
                      className="flex-1 rounded-t-sm bg-[#dbeafe]"
                      style={{ height: `${(m.filed / MAX_BAR) * 88}px` }}
                    />
                    <div
                      className="flex-1 rounded-t-sm bg-[#1e40af]"
                      style={{ height: `${(m.resolved / MAX_BAR) * 88}px` }}
                    />
                  </div>
                  <span className="text-[9px] text-[#94a3b8]">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-[#dbeafe]" />
                <span className="text-xs text-[#64748b]">Filed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-[#1e40af]" />
                <span className="text-xs text-[#64748b]">Resolved</span>
              </div>
            </div>
          </Card>

          {/* Incident Hotspots map */}
          <Card>
            <CardHeader>
              <CardTitle>Incident Hotspots</CardTitle>
              <button className="text-xs text-[#1e40af]">↗ Expand</button>
            </CardHeader>
            <div className="relative h-[180px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-[#94a3b8]" />
              </div>
              {/* Hotspot indicators */}
              <div className="absolute left-[45%] top-[35%] h-5 w-5 rounded-full border-2 border-white bg-red-500/70 shadow-md" />
              <div className="absolute bottom-[30%] left-[55%] h-4 w-4 rounded-full border-2 border-white bg-red-400/60 shadow-md" />
              <div className="absolute left-[35%] top-[55%] h-3 w-3 rounded-full border-2 border-white bg-amber-500/60 shadow-md" />
              <div className="absolute right-[35%] top-[25%] h-3 w-3 rounded-full border-2 border-white bg-amber-400/50 shadow-md" />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-[#64748b]">High Density</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-xs text-[#64748b]">Moderate</span>
              </div>
            </div>
          </Card>

          {/* Performance Score */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Score</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {[
                { label: 'Resolution Rate', value: 88, color: 'bg-green-500' },
                { label: 'Avg SLA Compliance', value: 74, color: 'bg-[#1e40af]' },
                { label: 'Citizen Satisfaction', value: 82, color: 'bg-amber-500' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-[#64748b]">{row.label}</span>
                    <span className="text-xs font-bold text-[#0f172a]">{row.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className={`h-full ${row.color} rounded-full transition-all`}
                      style={{ width: `${row.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
