import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'submitted'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'rejected'
  | 'urgent'
  | 'reported'
  | 'pending'
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-100',
  assigned: 'bg-amber-50 text-amber-700 border-amber-100',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  resolved: 'bg-green-50 text-green-700 border-green-100',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
  urgent: 'bg-red-50 text-red-600 border-red-100',
  reported: 'bg-blue-50 text-blue-700 border-blue-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  default: 'bg-slate-100 text-slate-600 border-slate-200',
  success: 'bg-green-50 text-green-700 border-green-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
};

const DOT_COLOURS: Record<BadgeVariant, string> = {
  submitted: 'bg-blue-500',
  assigned: 'bg-amber-500',
  in_progress: 'bg-indigo-500',
  resolved: 'bg-green-500',
  verified: 'bg-emerald-500',
  rejected: 'bg-red-500',
  urgent: 'bg-red-500',
  reported: 'bg-blue-500',
  pending: 'bg-amber-500',
  default: 'bg-slate-400',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
};

export function Badge({ variant = 'default', children, className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', DOT_COLOURS[variant])} />
      )}
      {children}
    </span>
  );
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    SUBMITTED: 'submitted',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
  };
  return map[status] ?? 'default';
}
