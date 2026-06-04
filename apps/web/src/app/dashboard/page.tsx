import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  Star,
  MapPin,
  ChevronRight,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

/* ─── Mock Data ─────────────────────────────────────────────────────── */
const ACTIVE_REPORTS = [
  {
    id: '#AWZ-04821',
    title: 'Pothole on MG Road',
    category: 'Road',
    categoryEmoji: '🛣️',
    location: 'Sector 14, Gurgaon',
    status: 'ASSIGNED',
    daysAgo: 2,
    assignedTo: 'PWD Department',
    progress: 40,
    note: 'Update expected today',
  },
  {
    id: '#AWZ-04819',
    title: 'Water Pipe Leak',
    category: 'Water',
    categoryEmoji: '💧',
    location: 'Residential Colony',
    status: 'SUBMITTED',
    daysAgo: 0,
    assignedTo: null,
    progress: 15,
    note: 'Awaiting verification',
  },
];

const RECENT_ACTIVITY = [
  {
    type: 'resolved',
    text: 'Streetlight repaired on Park Avenue.',
    sub: '10 mins ago · Resolved by Municipal Corp',
    icon: CheckCircle2,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    type: 'initiative',
    text: 'New Initiative: Tree planting drive scheduled for Sunday.',
    sub: '1 hour ago · Announced by Ward Councillor',
    icon: TrendingUp,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#1e40af]',
  },
  {
    type: 'assigned',
    text: 'Your complaint #AWZ-04819 has been assigned to the Water Board.',
    sub: '3 hours ago',
    icon: Users,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

const NEARBY_ISSUES = [
  {
    title: 'Broken drain cover near market',
    category: 'Drainage',
    distance: '0.3 km',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Garbage not collected since 3 days',
    category: 'Garbage',
    distance: '0.5 km',
    status: 'SUBMITTED',
  },
  {
    title: 'Street light out on Elm Street',
    category: 'Electricity',
    distance: '0.8 km',
    status: 'ASSIGNED',
  },
];

const STATUS_PROGRESS: Record<string, number> = {
  SUBMITTED: 16,
  ASSIGNED: 33,
  IN_PROGRESS: 66,
  RESOLVED: 83,
  VERIFIED: 100,
};

export default function CitizenDashboard() {
  return (
    <div className="max-w-[1200px] px-8 py-8">
      {/* Welcome banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#dbeafe_0%,_transparent_60%)]" />
        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a]">Hello, Aarav.</h1>
            <p className="mt-1 max-w-md text-sm text-[#64748b]">
              Your reports have helped{' '}
              <span className="font-semibold text-[#1e40af]">450 neighbors</span> this month. Thank
              you for your active civic participation.{' '}
            </p>
          </div>
          <Avatar name="Aarav Sharma" size="lg" />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Reports"
          value="3"
          sub="Pending"
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-[#1e40af]"
        />
        <StatCard
          label="Resolved"
          value="12"
          sub="+2 this week"
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          trend={{ value: '+2', up: true }}
        />
        <StatCard
          label="Impact Points"
          value="2,400"
          sub="Top 5% in ward"
          icon={Star}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Active Reports */}
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

            <div className="mt-4 divide-y divide-[#f1f5f9]">
              {ACTIVE_REPORTS.map((report) => (
                <Link key={report.id} href={`/dashboard/complaints/${report.id}`}>
                  <div className="flex gap-4 px-5 py-4 transition-colors hover:bg-[#f8fafc]">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-xl">
                      {report.categoryEmoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[#0f172a]">
                          {report.title}
                        </p>
                        <Badge
                          variant={statusToBadgeVariant(report.status)}
                          className="flex-shrink-0 text-[10px]"
                        >
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-[#94a3b8]" />
                        <span className="truncate text-xs text-[#94a3b8]">
                          {report.assignedTo ?? report.location}
                        </span>
                        <span className="text-[#e2e8f0]">·</span>
                        <span className="whitespace-nowrap text-xs text-[#94a3b8]">
                          {report.daysAgo === 0 ? 'Today' : `${report.daysAgo}d ago`}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2.5">
                        <div className="h-1 overflow-hidden rounded-full bg-[#f1f5f9]">
                          <div
                            className="h-full rounded-full bg-[#1e40af] transition-all"
                            style={{ width: `${STATUS_PROGRESS[report.status] ?? 20}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-[#94a3b8]">{report.note}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="px-5 pb-5 pt-2">
              <Link href="/dashboard/report">
                <Button variant="outline" size="sm" className="w-full border-dashed">
                  <Plus className="h-4 w-4" />
                  Report a New Issue
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0f172a]">Recent Activity in Ward 7</h2>
            </div>
            <div className="space-y-3">
              {RECENT_ACTIVITY.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg ${item.iconBg} mt-0.5 flex flex-shrink-0 items-center justify-center`}
                  >
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm text-[#0f172a]">{item.text}</p>
                    <p className="mt-0.5 text-xs text-[#94a3b8]">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column — Nearby Issues + Map */}
        <div className="space-y-6">
          {/* Map placeholder */}
          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between px-4 pb-0 pt-4">
              <h2 className="text-sm font-semibold text-[#0f172a]">Nearby Issues</h2>
              <button className="text-xs font-medium text-[#1e40af]">Expand</button>
            </div>
            {/* Map placeholder */}
            <div className="relative mx-4 mt-3 h-[200px] overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="mx-auto mb-1 h-8 w-8 text-[#94a3b8]" />
                  <p className="text-xs text-[#94a3b8]">Map Integration</p>
                  <p className="text-[10px] text-[#94a3b8]">Mapbox GL / Google Maps</p>
                </div>
              </div>
              {/* Simulated pins */}
              <div className="absolute left-[35%] top-[40%] h-3 w-3 rounded-full border-2 border-white bg-red-500 shadow-md" />
              <div className="absolute right-[30%] top-[55%] h-3 w-3 rounded-full border-2 border-white bg-amber-500 shadow-md" />
              <div className="absolute bottom-[35%] left-[55%] h-3.5 w-3.5 rounded-full border-2 border-white bg-[#1e40af] shadow-md" />
              <div className="absolute right-[40%] top-[30%] h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 shadow-md" />
            </div>
            <div className="mb-1 px-4 py-2">
              <p className="text-[10px] text-[#94a3b8]">Showing issues within 2km</p>
            </div>

            {/* Nearby list */}
            <div className="divide-y divide-[#f1f5f9] pb-2">
              {NEARBY_ISSUES.map((issue, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[#1e40af]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#0f172a]">{issue.title}</p>
                    <p className="text-[10px] text-[#94a3b8]">
                      {issue.category} · {issue.distance}
                    </p>
                  </div>
                  <Badge
                    variant={statusToBadgeVariant(issue.status)}
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {issue.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick stats */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-[#0f172a]">Community Stats · Ward 7</h2>
            <div className="space-y-3">
              {[
                { label: 'Open Issues Nearby', value: 23, color: 'bg-[#1e40af]', pct: 46 },
                { label: 'Resolved This Month', value: 87, color: 'bg-green-500', pct: 87 },
                { label: 'Avg Resolution Days', value: '4.2d', color: 'bg-amber-500', pct: 60 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-[#64748b]">{row.label}</span>
                    <span className="text-xs font-semibold text-[#0f172a]">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className={`h-full ${row.color} rounded-full`}
                      style={{ width: `${row.pct}%` }}
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
