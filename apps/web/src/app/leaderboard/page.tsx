import { Award, Search, Filter } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const LEADERBOARD = [
  {
    rank: 1,
    name: 'Suresh Gupta',
    constituency: 'Bengaluru Central',
    resolved: 412,
    pending: 24,
    rate: 94,
    avgDays: 3.8,
    score: 9.6,
    badge: 'gold',
  },
  {
    rank: 2,
    name: 'Priya Nair',
    constituency: 'Andheri West',
    resolved: 389,
    pending: 31,
    rate: 91,
    avgDays: 4.1,
    score: 9.1,
    badge: 'silver',
  },
  {
    rank: 3,
    name: 'Amit Singh',
    constituency: 'Gurgaon Central',
    resolved: 341,
    pending: 42,
    rate: 87,
    avgDays: 4.5,
    score: 8.7,
    badge: 'bronze',
  },
  {
    rank: 4,
    name: 'K. Ramaswamy',
    constituency: 'Chennai South',
    resolved: 298,
    pending: 56,
    rate: 83,
    avgDays: 5.2,
    score: 8.2,
    badge: '',
  },
  {
    rank: 5,
    name: 'Kavita Sahu',
    constituency: 'Bhopal East',
    resolved: 267,
    pending: 63,
    rate: 79,
    avgDays: 5.8,
    score: 7.8,
    badge: '',
  },
  {
    rank: 6,
    name: 'Rajiv Kumar',
    constituency: 'Lucknow West',
    resolved: 241,
    pending: 71,
    rate: 76,
    avgDays: 6.1,
    score: 7.4,
    badge: '',
  },
  {
    rank: 7,
    name: 'Deepa Reddy',
    constituency: 'Hyderabad East',
    resolved: 218,
    pending: 84,
    rate: 73,
    avgDays: 6.4,
    score: 7.1,
    badge: '',
  },
  {
    rank: 8,
    name: 'Mohan Lal',
    constituency: 'Delhi North',
    resolved: 195,
    pending: 93,
    rate: 69,
    avgDays: 7.2,
    score: 6.7,
    badge: '',
  },
];

const BADGE_STYLES: Record<string, string> = {
  gold: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  silver: 'bg-slate-100 text-slate-700 border border-slate-200',
  bronze: 'bg-orange-100 text-orange-700 border border-orange-200',
};

const RANK_BADGE: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-slate-300 text-slate-700',
  3: 'bg-orange-300 text-orange-900',
};

const TIME_FILTERS = ['Weekly', 'Monthly', 'Quarterly', 'All Time'];

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PublicNavbar />

      {/* Hero */}
      <div className="border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#0f172a]">Governance Leaderboard</h1>
              <p className="mt-0.5 text-sm text-[#64748b]">
                Public ranking of MLA/Authority performance based on issue resolution
              </p>
            </div>
          </div>

          {/* Top 3 highlight */}
          <div className="mt-6 grid max-w-2xl grid-cols-3 gap-4">
            {LEADERBOARD.slice(0, 3).map((entry, i) => (
              <div
                key={entry.rank}
                className={`rounded-2xl border p-4 text-center ${i === 0 ? 'order-first border-yellow-200 bg-yellow-50' : i === 1 ? 'border-slate-200 bg-slate-50' : 'border-orange-200 bg-orange-50'}`}
              >
                <div
                  className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${RANK_BADGE[entry.rank]}`}
                >
                  {entry.rank}
                </div>
                <Avatar name={entry.name} size="md" className="mx-auto mb-2" />
                <p className="text-sm font-semibold leading-tight text-[#0f172a]">{entry.name}</p>
                <p className="mt-0.5 text-[10px] text-[#64748b]">{entry.constituency}</p>
                <p
                  className={`mt-2 text-lg font-bold ${i === 0 ? 'text-yellow-700' : i === 1 ? 'text-slate-700' : 'text-orange-700'}`}
                >
                  {entry.score}/10
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Controls */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          {/* Time filters */}
          <div className="flex gap-1 rounded-xl bg-[#f1f5f9] p-1">
            {TIME_FILTERS.map((f) => (
              <button
                key={f}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${f === 'Monthly' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="search"
              placeholder="Search by name or constituency…"
              className="h-10 w-full rounded-[10px] border border-[#e2e8f0] bg-white pl-9 pr-4 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10"
            />
          </div>
          <Button variant="outline" size="md">
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        {/* Full Leaderboard table */}
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                  {[
                    'Rank',
                    'Authority',
                    'Constituency',
                    'Filed',
                    'Resolved',
                    'Avg Days',
                    'Rate',
                    'Score',
                    'Profile',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={`border-b border-[#f8fafc] transition-colors hover:bg-[#f8fafc] ${entry.rank <= 3 ? 'bg-amber-50/30' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${RANK_BADGE[entry.rank] ?? 'bg-[#f1f5f9] text-[#64748b]'}`}
                      >
                        {entry.rank}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={entry.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#0f172a]">{entry.name}</p>
                          {entry.badge && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_STYLES[entry.badge]}`}
                            >
                              {entry.badge.charAt(0).toUpperCase() + entry.badge.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#64748b]">{entry.constituency}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-[#0f172a]">
                      {entry.resolved + entry.pending}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-green-600">
                      {entry.resolved}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#0f172a]">{entry.avgDays}d</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#f1f5f9]">
                          <div
                            className={`h-full rounded-full ${entry.rate >= 90 ? 'bg-green-500' : entry.rate >= 75 ? 'bg-[#1e40af]' : 'bg-amber-500'}`}
                            style={{ width: `${entry.rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[#0f172a]">{entry.rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-sm font-bold ${entry.score >= 9 ? 'text-green-600' : entry.score >= 7 ? 'text-[#1e40af]' : 'text-amber-600'}`}
                      >
                        {entry.score}/10
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-[#1e40af]">
                        View →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-center text-xs text-[#94a3b8]">
            Showing 8 of 94 authorities · Scores computed monthly via AWAAZ Governance Engine
          </div>
        </Card>
      </div>
    </div>
  );
}
