import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Shield,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

const TIMELINE = [
  {
    status: 'SUBMITTED',
    label: 'Complaint Submitted',
    who: 'Aarav Sharma (Citizen)',
    time: '2 days ago',
    done: true,
    active: false,
    note: 'Complaint registered successfully.',
  },
  {
    status: 'ASSIGNED',
    label: 'Assigned to Authority',
    who: 'Admin Team',
    time: '1 day ago',
    done: true,
    active: false,
    note: 'Assigned to PWD Department.',
  },
  {
    status: 'IN_PROGRESS',
    label: 'Work In Progress',
    who: 'PWD Department',
    time: 'Today',
    done: false,
    active: true,
    note: '',
  },
  {
    status: 'RESOLVED',
    label: 'Marked as Resolved',
    who: '—',
    time: '—',
    done: false,
    active: false,
    note: '',
  },
  {
    status: 'VERIFIED',
    label: 'Verified by Citizen',
    who: '—',
    time: '—',
    done: false,
    active: false,
    note: '',
  },
];

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isResolved = false;

  return (
    <div>
      {/* Header */}
      <div className="px-8 pb-0 pt-8">
        <Link
          href="/dashboard/complaints"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#64748b] transition-colors hover:text-[#0f172a]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Complaints
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-xs text-[#94a3b8]">#{id}</span>
              <Badge variant="in_progress" dot>
                IN PROGRESS
              </Badge>
              <Badge variant="warning" className="text-[10px]">
                Normal Priority
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-[#0f172a]">
              Pothole on MG Road near Bus Stop 7
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#64748b]">
              <MapPin className="h-3.5 w-3.5" />
              Sector 14, MG Road, Gurgaon, Haryana
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-8 py-6 lg:grid-cols-[1fr,320px]">
        {/* Left */}
        <div className="space-y-5">
          {/* Media gallery */}
          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <Shield className="h-3.5 w-3.5" />
                SHA-256 Verified
              </div>
            </CardHeader>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[#e2e8f0] bg-gradient-to-br from-slate-100 to-slate-200 transition-opacity hover:opacity-90"
                >
                  <Camera className="h-6 w-6 text-[#94a3b8]" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                    <ExternalLink className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 rounded bg-black/50 px-1 text-[10px] text-white">
                    {i === 3 ? 'MP4' : 'JPG'}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-[#94a3b8]">
              <Clock className="h-3 w-3" />
              Captured: June 1, 2026 at 10:32 AM
            </p>
          </Card>

          {/* Complaint info */}
          <Card>
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                  Category
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛣️</span>
                  <span className="text-sm font-medium text-[#0f172a]">Road Issues</span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                  Description
                </p>
                <p className="text-sm leading-relaxed text-[#64748b]">
                  Large pothole approximately 2 feet wide and 6 inches deep near bus stop 7 on MG
                  Road. Multiple vehicles have been damaged. Issue present for over 3 weeks. Very
                  dangerous for two-wheelers especially at night.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                    Filed On
                  </p>
                  <p className="text-sm text-[#0f172a]">June 1, 2026</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                    Constituency
                  </p>
                  <p className="text-sm text-[#0f172a]">Gurgaon Central</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <div className="relative">
              {TIMELINE.map((step, i) => (
                <div key={step.status} className="relative flex gap-4">
                  {/* Connector line */}
                  {i < TIMELINE.length - 1 && (
                    <div
                      className={`absolute left-[15px] top-8 h-full w-0.5 ${step.done ? 'bg-[#1e40af]' : 'bg-[#e2e8f0]'}`}
                    />
                  )}
                  {/* Dot */}
                  <div
                    className={`z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                      step.done
                        ? 'bg-[#1e40af]'
                        : step.active
                          ? 'bg-[#1e40af] ring-4 ring-blue-100'
                          : 'bg-[#e2e8f0]'
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : step.active ? (
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-medium ${step.done || step.active ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}
                      >
                        {step.label}
                      </p>
                      <span className="text-xs text-[#94a3b8]">{step.time}</span>
                    </div>
                    {step.who !== '—' && (
                      <p className="mt-0.5 text-xs text-[#64748b]">{step.who}</p>
                    )}
                    {step.note && (
                      <p className="mt-0.5 text-xs italic text-[#94a3b8]">{step.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Verification Panel (shown if RESOLVED) */}
          {isResolved && (
            <Card className="border-green-200 bg-green-50/50">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0f172a]">Has the issue been fixed?</h3>
                  <p className="mt-1 text-sm text-[#64748b]">
                    The authority has marked this as resolved. Please verify.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Yes, Issue Resolved
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      No, Still Pending
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Assigned Authority */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Authority</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-3">
              <Avatar name="Suresh Gupta" size="md" />
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">Suresh Gupta</p>
                <p className="text-xs text-[#64748b]">MLA · Gurgaon Central</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[#f8fafc] p-2.5 text-center">
                <p className="text-base font-bold text-green-600">87%</p>
                <p className="text-[10px] text-[#94a3b8]">Resolution Rate</p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] p-2.5 text-center">
                <p className="text-base font-bold text-[#0f172a]">4.2d</p>
                <p className="text-[10px] text-[#94a3b8]">Avg. Time</p>
              </div>
            </div>
            <Link href="/mla/suresh-gupta">
              <Button variant="outline" size="sm" className="mt-3 w-full">
                View Profile <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <div className="relative flex h-[140px] items-center justify-center overflow-hidden rounded-xl border border-[#e2e8f0] bg-gradient-to-br from-slate-100 to-slate-200">
              <MapPin className="h-8 w-8 text-[#1e40af]" />
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-[#64748b]">
              <MapPin className="h-3 w-3 text-[#1e40af]" />
              Sector 14, MG Road, Gurgaon
            </p>
          </Card>

          {/* Quick info */}
          <Card>
            <CardHeader>
              <CardTitle>Complaint Info</CardTitle>
            </CardHeader>
            <div className="space-y-2.5">
              {[
                { label: 'Complaint ID', value: '#AWZ-04821' },
                { label: 'Filed By', value: 'Aarav Sharma' },
                { label: 'Category', value: 'Road Issues' },
                { label: 'Priority', value: 'Normal' },
                { label: 'Filed On', value: 'June 1, 2026' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#94a3b8]">{row.label}</span>
                  <span className="text-xs font-medium text-[#0f172a]">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
