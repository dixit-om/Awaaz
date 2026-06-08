'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ExternalLink, MapPin } from 'lucide-react';
import { TRPCClientError } from '@trpc/client';
import type { ComplaintDetail, UserRole } from '@awaaz/types';
import { Badge, statusToBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { ComplaintTimeline } from '@/components/complaints/complaint-timeline';
import { StatusUpdateModal } from '@/components/complaints/status-update-modal';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatComplaintId,
  formatDateTime,
  isHighPriority,
} from '@/lib/complaints';
import { trpc } from '@/trpc/client';

interface ComplaintDetailViewProps {
  complaint: ComplaintDetail;
  role: UserRole;
  backHref: string;
  backLabel: string;
  onRefetch: () => void;
}

export function ComplaintDetailView({
  complaint,
  role,
  backHref,
  backLabel,
  onRefetch,
}: ComplaintDetailViewProps) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const updateMutation = trpc.complaints.updateComplaintStatus.useMutation({
    onSuccess: () => {
      setVerifyError('');
      onRefetch();
    },
    onError: (err) => {
      setVerifyError(err instanceof TRPCClientError ? err.message : 'Action failed');
    },
  });

  const canUpdateStatus =
    role === 'mla' || role === 'admin'
      ? complaint.status !== 'VERIFIED' && complaint.status !== 'REJECTED'
      : false;

  const isResolved = complaint.status === 'RESOLVED';
  const isCitizen = role === 'citizen';

  function handleVerify() {
    updateMutation.mutate({ id: complaint.id, newStatus: 'VERIFIED' });
  }

  function handleRejectResolution() {
    const remarks = prompt('Please explain why the issue is not resolved (min 5 characters):');
    if (!remarks || remarks.trim().length < 5) return;
    updateMutation.mutate({
      id: complaint.id,
      newStatus: 'REJECTED',
      remarks: remarks.trim(),
    });
  }

  return (
    <div>
      <div className="px-8 pb-0 pt-8">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#64748b] transition-colors hover:text-[#0f172a]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[#94a3b8]">
                {formatComplaintId(complaint.id)}
              </span>
              <Badge variant={statusToBadgeVariant(complaint.status)} dot>
                {STATUS_LABELS[complaint.status]}
              </Badge>
              <Badge
                variant={isHighPriority(complaint.priority) ? 'urgent' : 'default'}
                className="text-[10px]"
              >
                {PRIORITY_LABELS[complaint.priority]} Priority
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-[#0f172a]">{complaint.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#64748b]">
              <MapPin className="h-3.5 w-3.5" />
              {complaint.location.address ??
                `${complaint.location.latitude.toFixed(4)}, ${complaint.location.longitude.toFixed(4)}`}
            </p>
          </div>
          {canUpdateStatus && (
            <Button size="sm" onClick={() => setShowStatusModal(true)}>
              Update Status
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 px-8 py-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
            </CardHeader>
            {complaint.media.filter((m) => m.secureUrl && m.status === 'READY').length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {complaint.media
                  .filter((m) => m.secureUrl && m.status === 'READY')
                  .map((m) => (
                    <a
                      key={m.id}
                      href={m.secureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#f8fafc]"
                    >
                      {m.thumbnailUrl ? (
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${m.thumbnailUrl})` }}
                        />
                      ) : (
                        <Camera className="h-6 w-6 text-[#94a3b8]" />
                      )}
                      <ExternalLink className="absolute right-2 top-2 h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-[#94a3b8]">No evidence uploaded yet.</p>
            )}
          </Card>

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
                  <span className="text-lg">{complaint.category.icon ?? '📋'}</span>
                  <span className="text-sm font-medium text-[#0f172a]">
                    {complaint.category.name}
                  </span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                  Description
                </p>
                <p className="text-sm leading-relaxed text-[#64748b]">{complaint.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                    Filed On
                  </p>
                  <p className="text-sm text-[#0f172a]">{formatDateTime(complaint.createdAt)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                    Last Updated
                  </p>
                  <p className="text-sm text-[#0f172a]">{formatDateTime(complaint.updatedAt)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <ComplaintTimeline history={complaint.statusHistory} />
          </Card>

          {isCitizen && isResolved && (
            <Card className="border-green-200 bg-green-50/50">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0f172a]">Has the issue been fixed?</h3>
                  <p className="mt-1 text-sm text-[#64748b]">
                    The authority has marked this as resolved. Please verify.
                  </p>
                  {verifyError && <p className="mt-2 text-sm text-[#dc2626]">{verifyError}</p>}
                  <div className="mt-4 flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleVerify}
                      loading={updateMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Yes, Issue Resolved
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={handleRejectResolution}
                      disabled={updateMutation.isPending}
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Authority</CardTitle>
            </CardHeader>
            {complaint.assignedAuthority ? (
              <div className="flex items-center gap-3">
                <Avatar name={complaint.assignedAuthority.name ?? 'Authority'} size="md" />
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {complaint.assignedAuthority.name ?? 'Unnamed Authority'}
                  </p>
                  <p className="text-xs text-[#64748b]">MLA / Authority</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#94a3b8]">Not yet assigned to an authority.</p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <div className="relative flex h-[140px] items-center justify-center overflow-hidden rounded-xl border border-[#e2e8f0] bg-gradient-to-br from-slate-100 to-slate-200">
              <MapPin className="h-8 w-8 text-[#1e40af]" />
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-[#64748b]">
              <MapPin className="h-3 w-3 text-[#1e40af]" />
              {complaint.location.latitude.toFixed(5)}, {complaint.location.longitude.toFixed(5)}
            </p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complaint Info</CardTitle>
            </CardHeader>
            <div className="divide-y divide-[#f1f5f9]">
              {[
                { label: 'Complaint ID', value: formatComplaintId(complaint.id) },
                { label: 'Filed By', value: complaint.citizen.name ?? 'Citizen' },
                { label: 'Category', value: complaint.category.name },
                { label: 'Priority', value: PRIORITY_LABELS[complaint.priority] },
                { label: 'Filed On', value: formatDateTime(complaint.createdAt) },
              ].map((row) => (
                <div key={row.label} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
                    {row.label}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[#0f172a]">{row.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {showStatusModal && (
        <StatusUpdateModal
          complaintId={complaint.id}
          currentStatus={complaint.status}
          role={role}
          onClose={() => setShowStatusModal(false)}
          onSuccess={onRefetch}
        />
      )}
    </div>
  );
}
