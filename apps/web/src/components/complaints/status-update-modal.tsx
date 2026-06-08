'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { TRPCClientError } from '@trpc/client';
import type { ComplaintStatus, UserRole } from '@awaaz/types';
import { Button } from '@/components/ui/button';
import { getValidNextStatuses, STATUS_LABELS } from '@/lib/complaints';
import { trpc } from '@/trpc/client';

interface StatusUpdateModalProps {
  complaintId: string;
  currentStatus: ComplaintStatus;
  role: UserRole;
  onClose: () => void;
  onSuccess: () => void;
}

export function StatusUpdateModal({
  complaintId,
  currentStatus,
  role,
  onClose,
  onSuccess,
}: StatusUpdateModalProps) {
  const nextStatuses = getValidNextStatuses(role, currentStatus);
  const [newStatus, setNewStatus] = useState<ComplaintStatus | ''>(nextStatuses[0] ?? '');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const mutation = trpc.complaints.updateComplaintStatus.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => {
      setError(err instanceof TRPCClientError ? err.message : 'Failed to update status');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newStatus) return;
    setError('');
    mutation.mutate({
      id: complaintId,
      newStatus,
      remarks: remarks.trim() || undefined,
    });
  }

  if (nextStatuses.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0f172a]">Update Status</h2>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#64748b]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-[#64748b]">
          Current status: <span className="font-medium">{STATUS_LABELS[currentStatus]}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748b]">New Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
              className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm focus:border-[#1e40af] focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
            >
              {nextStatuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748b]">
              Remarks {newStatus === 'REJECTED' ? '(required)' : '(optional)'}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Add a note about this status change…"
              className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-sm focus:border-[#1e40af] focus:outline-none focus:ring-1 focus:ring-[#1e40af]"
            />
          </div>

          {error && <p className="text-sm text-[#dc2626]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={mutation.isPending}
              disabled={!newStatus || (newStatus === 'REJECTED' && remarks.trim().length < 5)}
            >
              Update Status
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
