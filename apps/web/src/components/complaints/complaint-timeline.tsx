import { Check } from 'lucide-react';
import type { ComplaintHistoryItem } from '@awaaz/types';
import { STATUS_LABELS, formatDateTime } from '@/lib/complaints';
import { cn } from '@/lib/utils';

interface ComplaintTimelineProps {
  history: ComplaintHistoryItem[];
}

export function ComplaintTimeline({ history }: ComplaintTimelineProps) {
  if (history.length === 0) {
    return <p className="py-4 text-center text-sm text-[#94a3b8]">No activity recorded yet.</p>;
  }

  return (
    <div className="space-y-0">
      {history.map((entry, i) => {
        const isLast = i === history.length - 1;
        return (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                  isLast
                    ? 'border-[#1e40af] bg-[#eff6ff] text-[#1e40af]'
                    : 'border-[#1e40af] bg-[#1e40af] text-white',
                )}
              >
                {isLast ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#1e40af]" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-[#e2e8f0]" />}
            </div>
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <p className="text-sm font-semibold text-[#0f172a]">
                {STATUS_LABELS[entry.newStatus]}
              </p>
              <p className="mt-0.5 text-xs text-[#64748b]">
                {entry.changedBy.name ?? 'System'} · {formatDateTime(entry.createdAt)}
              </p>
              {entry.remarks && (
                <p className="mt-1.5 rounded-lg bg-[#f8fafc] px-3 py-2 text-xs text-[#64748b]">
                  {entry.remarks}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
