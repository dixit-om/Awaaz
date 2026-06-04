import { Search, Filter, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/dashboard-layout';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const COMPLAINTS = [
  {
    id: '#BZ-492',
    category: 'Water Leakage',
    emoji: '💧',
    location: 'Indiranagar 100ft Rd',
    status: 'SUBMITTED',
    days: 5,
    priority: 'urgent',
  },
  {
    id: '#BZ-488',
    category: 'Streetlight Failure',
    emoji: '⚡',
    location: 'MG Road Junction',
    status: 'IN_PROGRESS',
    days: 3,
    priority: 'normal',
  },
  {
    id: '#BZ-475',
    category: 'Pothole Cluster',
    emoji: '🛣️',
    location: 'Koramangala 4th Blk',
    status: 'SUBMITTED',
    days: 4,
    priority: 'urgent',
  },
  {
    id: '#BZ-460',
    category: 'Garbage Accumulation',
    emoji: '🗑️',
    location: 'Ulsoor Lake Belt',
    status: 'IN_PROGRESS',
    days: 6,
    priority: 'normal',
  },
  {
    id: '#BZ-444',
    category: 'Road Repair',
    emoji: '🛣️',
    location: 'Jayanagar 4th Block',
    status: 'RESOLVED',
    days: 12,
    priority: 'normal',
  },
  {
    id: '#BZ-439',
    category: 'Drainage Block',
    emoji: '🚰',
    location: 'HSR Layout Sector 1',
    status: 'VERIFIED',
    days: 18,
    priority: 'normal',
  },
];

export default function MLAComplaintsPage() {
  return (
    <div>
      <PageHeader
        title="Assigned Complaints"
        subtitle="Complaints assigned to your constituency"
        breadcrumb={[{ label: 'Dashboard', href: '/mla' }, { label: 'Assigned Complaints' }]}
      />

      <div className="px-8 pb-8">
        {/* View toggle + filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex gap-1 rounded-xl bg-[#f1f5f9] p-1">
            {['List', 'Map'].map((v) => (
              <button
                key={v}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${v === 'List' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b]'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="search"
              placeholder="Search complaints…"
              className="h-10 w-full rounded-[10px] border border-[#e2e8f0] bg-white pl-9 pr-4 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10"
            />
          </div>
          <Button variant="outline" size="md">
            <Filter className="h-4 w-4" /> Filters
          </Button>
        </div>

        {/* Status tabs */}
        <div className="mb-5 flex w-fit gap-1 rounded-xl bg-[#f1f5f9] p-1">
          {['All', 'Pending Action', 'In Progress', 'Resolved'].map((tab) => (
            <button
              key={tab}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${tab === 'All' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                  {[
                    'Issue ID',
                    'Category',
                    'Location',
                    'Status',
                    'Filed',
                    'Priority',
                    'Action',
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
                {COMPLAINTS.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-[#f8fafc] transition-colors hover:bg-[#f8fafc] ${c.days >= 5 && c.status === 'SUBMITTED' ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-[#0f172a]">{c.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-xs text-[#0f172a]">
                        <span>{c.emoji}</span>
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-xs text-[#64748b]">
                        <MapPin className="h-3 w-3" />
                        {c.location}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={statusToBadgeVariant(c.status)} dot>
                        {c.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`flex items-center gap-1 text-xs ${c.days >= 5 ? 'font-medium text-red-500' : 'text-[#64748b]'}`}
                      >
                        <Clock className="h-3 w-3" />
                        {c.days}d ago
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.priority === 'urgent' ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          Urgent
                        </span>
                      ) : (
                        <span className="text-xs text-[#64748b]">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {c.status === 'SUBMITTED' ? (
                        <Button size="sm" className="h-7 px-3 text-xs">
                          Assign
                        </Button>
                      ) : c.status === 'IN_PROGRESS' ? (
                        <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
                          Update
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-xs text-[#1e40af]"
                        >
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
