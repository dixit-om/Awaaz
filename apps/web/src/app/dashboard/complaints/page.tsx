import Link from 'next/link';
import { Search, Filter, Plus, MapPin, Clock } from 'lucide-react';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/dashboard-layout';

const COMPLAINTS = [
  {
    id: '#AWZ-04821',
    title: 'Pothole on MG Road',
    category: 'Road',
    emoji: '🛣️',
    location: 'Sector 14, Gurgaon',
    status: 'ASSIGNED',
    days: 2,
    priority: 'normal',
  },
  {
    id: '#AWZ-04819',
    title: 'Water Pipe Leak near Block B',
    category: 'Water',
    emoji: '💧',
    location: 'Residential Colony',
    status: 'SUBMITTED',
    days: 0,
    priority: 'urgent',
  },
  {
    id: '#AWZ-04815',
    title: 'Garbage overflowing near market',
    category: 'Garbage',
    emoji: '🗑️',
    location: 'Civil Lines',
    status: 'IN_PROGRESS',
    days: 4,
    priority: 'normal',
  },
  {
    id: '#AWZ-04802',
    title: 'Broken street light on Park Road',
    category: 'Electricity',
    emoji: '⚡',
    location: 'Ward 7',
    status: 'RESOLVED',
    days: 8,
    priority: 'normal',
  },
  {
    id: '#AWZ-04798',
    title: 'Drainage blocked near school',
    category: 'Drainage',
    emoji: '🚰',
    location: 'School Zone',
    status: 'VERIFIED',
    days: 14,
    priority: 'normal',
  },
  {
    id: '#AWZ-04780',
    title: 'Road cave-in near bus stop',
    category: 'Road',
    emoji: '🛣️',
    location: 'Bus Stop 12',
    status: 'REJECTED',
    days: 21,
    priority: 'urgent',
  },
];

const STATUS_TABS = ['All', 'Active', 'Resolved', 'Verified'];

export default function ComplaintsPage() {
  return (
    <div>
      <PageHeader
        title="My Complaints"
        subtitle="All your filed civic issues"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Complaints' }]}
      >
        <Link href="/dashboard/report">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </Link>
      </PageHeader>

      <div className="px-8 pb-8">
        {/* Filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="search"
              placeholder="Search complaints…"
              className="h-10 w-full rounded-[10px] border border-[#e2e8f0] bg-white pl-9 pr-4 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10"
            />
          </div>
          <Button variant="outline" size="md" className="flex-shrink-0">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Status tabs */}
        <div className="mb-5 flex w-fit gap-1 rounded-xl bg-[#f1f5f9] p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${tab === 'All' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {COMPLAINTS.map((c) => (
            <Link key={c.id} href={`/dashboard/complaints/${c.id.replace('#', '')}`}>
              <Card hover className="overflow-hidden !p-0">
                <div className="flex gap-4 p-4">
                  {/* Icon */}
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-2xl">
                    {c.emoji}
                  </div>

                  {/* Main */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0f172a]">{c.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#94a3b8]">
                          <MapPin className="h-3 w-3" />
                          {c.location}
                          <span className="text-[#e2e8f0]">·</span>
                          <Clock className="h-3 w-3" />
                          {c.days === 0 ? 'Today' : `${c.days}d ago`}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                        <Badge variant={statusToBadgeVariant(c.status)} dot>
                          {c.status.replace('_', ' ')}
                        </Badge>
                        {c.priority === 'urgent' && (
                          <Badge variant="urgent" className="text-[10px]">
                            URGENT
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[#94a3b8]">{c.id}</span>
                      <span className="text-[#e2e8f0]">·</span>
                      <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] text-xs text-[#64748b]">
                        {c.category}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
