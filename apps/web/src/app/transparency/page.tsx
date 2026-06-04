import { MapPin, TrendingUp, CheckCircle2, Clock, Filter, BarChart3 } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';

const TOP_CONSTITUENCIES = [
  {
    rank: 1,
    name: 'Bengaluru Central',
    mla: 'Suresh Gupta',
    resolved: 412,
    rate: 94,
    trend: '+2%',
  },
  { rank: 2, name: 'Andheri West', mla: 'Priya Nair', resolved: 389, rate: 91, trend: '+1%' },
  { rank: 3, name: 'Gurgaon Central', mla: 'Amit Singh', resolved: 341, rate: 87, trend: '+3%' },
  { rank: 4, name: 'Chennai South', mla: 'K. Ramaswamy', resolved: 298, rate: 83, trend: '0%' },
  { rank: 5, name: 'Bhopal East', mla: 'Kavita Sahu', resolved: 267, rate: 79, trend: '-1%' },
];

const RECENT_COMPLAINTS = [
  {
    id: '#AWZ-04825',
    title: 'Water pipe burst on NH-8',
    category: 'Water',
    location: 'Gurgaon',
    status: 'IN_PROGRESS',
    filed: '1h ago',
  },
  {
    id: '#AWZ-04824',
    title: 'Pothole causing accidents near school',
    category: 'Road',
    location: 'Andheri',
    status: 'ASSIGNED',
    filed: '2h ago',
  },
  {
    id: '#AWZ-04823',
    title: 'Garbage not collected for 4 days',
    category: 'Garbage',
    location: 'Bengaluru',
    status: 'VERIFIED',
    filed: '5h ago',
  },
  {
    id: '#AWZ-04822',
    title: 'Street light out on main road',
    category: 'Electricity',
    location: 'Bhopal',
    status: 'RESOLVED',
    filed: '8h ago',
  },
  {
    id: '#AWZ-04821',
    title: 'Drainage blocked near market',
    category: 'Drainage',
    location: 'Chennai',
    status: 'SUBMITTED',
    filed: '12h ago',
  },
];

const CATEGORY_STATS = [
  { name: 'Road', emoji: '🛣️', total: 2156, resolved: 1892, pct: 88 },
  { name: 'Water', emoji: '💧', total: 987, resolved: 851, pct: 86 },
  { name: 'Garbage', emoji: '🗑️', total: 1284, resolved: 1012, pct: 79 },
  { name: 'Electricity', emoji: '⚡', total: 743, resolved: 682, pct: 92 },
  { name: 'Drainage', emoji: '🚰', total: 621, resolved: 498, pct: 80 },
  { name: 'Infrastructure', emoji: '🏗️', total: 534, resolved: 389, pct: 73 },
];

const RANK_BADGE: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-slate-300 text-slate-700',
  3: 'bg-orange-300 text-orange-900',
};

export default function TransparencyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PublicNavbar />

      {/* Hero */}
      <div className="border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-[#0f172a]">Transparency Portal</h1>
          <p className="mt-1 text-[#64748b]">
            Real-time public data on civic issues across India. No login required.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Live Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Complaints"
            value="6,325"
            icon={BarChart3}
            iconBg="bg-blue-50"
            iconColor="text-[#1e40af]"
            trend={{ value: '8%', up: true }}
          />
          <StatCard
            label="Resolved"
            value="5,324"
            icon={CheckCircle2}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            trend={{ value: '12%', up: true }}
          />
          <StatCard
            label="In Progress"
            value="743"
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            label="Verification Rate"
            value="84%"
            icon={TrendingUp}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            trend={{ value: '3%', up: true }}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          {/* Map + recent */}
          <div className="space-y-5">
            {/* Interactive Map */}
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between px-4 pb-0 pt-4">
                <h2 className="text-base font-semibold text-[#0f172a]">Complaint Map</h2>
                <div className="flex gap-2">
                  {['Heatmap', 'Pins', 'Clusters'].map((v) => (
                    <button
                      key={v}
                      className={`rounded-lg border px-3 py-1 text-xs transition-colors ${v === 'Heatmap' ? 'border-[#1e40af] bg-[#1e40af] text-white' : 'border-[#e2e8f0] text-[#64748b] hover:border-[#1e40af]/40'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              {/* Map placeholder */}
              <div className="relative mx-4 mb-4 mt-3 h-[300px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <MapPin className="h-10 w-10 text-[#94a3b8]" />
                  <p className="text-sm text-[#64748b]">Interactive Map</p>
                  <p className="text-xs text-[#94a3b8]">Mapbox GL integration point</p>
                </div>
                {/* Simulated heatmap blobs */}
                <div className="absolute left-[30%] top-[25%] h-20 w-20 rounded-full bg-red-400/25 blur-xl" />
                <div className="absolute bottom-[30%] right-[25%] h-16 w-16 rounded-full bg-red-400/20 blur-lg" />
                <div className="absolute left-[55%] top-[50%] h-12 w-12 rounded-full bg-amber-400/20 blur-lg" />
                {/* Pins */}
                <div className="absolute left-[31%] top-[27%] h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow-md" />
                <div className="absolute bottom-[32%] right-[27%] h-3 w-3 rounded-full border-2 border-white bg-amber-500 shadow-md" />
                <div className="absolute left-[56%] top-[52%] h-3 w-3 rounded-full border-2 border-white bg-green-500 shadow-md" />
                <div className="absolute right-[40%] top-[40%] h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow-md" />
                {/* Filter bar */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 backdrop-blur-sm">
                  <Filter className="h-3.5 w-3.5 text-[#64748b]" />
                  <span className="text-xs text-[#64748b]">Filter by:</span>
                  {['All Categories', 'Last 30 days'].map((f) => (
                    <span
                      key={f}
                      className="rounded-md bg-[#f1f5f9] px-2 py-0.5 text-xs text-[#64748b]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Complaints</CardTitle>
                <span className="text-xs text-[#94a3b8]">Live updates</span>
              </CardHeader>
              <div className="space-y-3">
                {RECENT_COMPLAINTS.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 border-b border-[#f8fafc] py-2 last:border-0"
                  >
                    <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-[#1e40af]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#0f172a]">{c.title}</p>
                      <p className="text-xs text-[#94a3b8]">
                        {c.location} · {c.filed}
                      </p>
                    </div>
                    <Badge
                      variant={statusToBadgeVariant(c.status)}
                      className="flex-shrink-0 text-[10px]"
                    >
                      {c.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Top Constituencies */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Constituencies</CardTitle>
              </CardHeader>
              <div className="divide-y divide-[#f8fafc]">
                {TOP_CONSTITUENCIES.map((c) => (
                  <div key={c.rank} className="flex items-center gap-3 py-3">
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${RANK_BADGE[c.rank] ?? 'bg-[#f1f5f9] text-[#64748b]'}`}
                    >
                      {c.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0f172a]">{c.name}</p>
                      <p className="text-xs text-[#94a3b8]">
                        {c.mla} · {c.resolved} resolved
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-[#0f172a]">{c.rate}%</p>
                      <p
                        className={`text-[10px] font-medium ${c.trend.startsWith('+') ? 'text-green-600' : c.trend === '0%' ? 'text-[#94a3b8]' : 'text-red-500'}`}
                      >
                        {c.trend}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Category Stats */}
            <Card>
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {CATEGORY_STATS.map((cat) => (
                  <div key={cat.name}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-base">{cat.emoji}</span>
                      <div className="flex flex-1 items-center justify-between">
                        <span className="text-xs text-[#64748b]">{cat.name}</span>
                        <span className="text-xs font-semibold text-[#0f172a]">
                          {cat.pct}% resolved
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                      <div
                        className={`h-full rounded-full ${cat.pct >= 90 ? 'bg-green-500' : cat.pct >= 80 ? 'bg-[#1e40af]' : 'bg-amber-500'}`}
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
