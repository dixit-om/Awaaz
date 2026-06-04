import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; up?: boolean };
  className?: string;
  accent?: boolean;
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = 'text-[#1e40af]',
  iconBg = 'bg-blue-50',
  trend,
  className,
  accent = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-[#e2e8f0] bg-white p-5',
        'shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]',
        accent && 'border-[#1e40af] bg-[#1e40af] text-white',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-xs font-medium uppercase tracking-wide',
              accent ? 'text-blue-200' : 'text-[#64748b]',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'mt-1 text-3xl font-bold tabular-nums',
              accent ? 'text-white' : 'text-[#0f172a]',
            )}
          >
            {value}
          </p>
          {sub && (
            <p className={cn('mt-1 text-xs', accent ? 'text-blue-200' : 'text-[#64748b]')}>{sub}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.up ? 'text-green-600' : 'text-red-500',
                  accent && (trend.up ? 'text-green-300' : 'text-red-300'),
                )}
              >
                {trend.up ? '↑' : '↓'} {trend.value}
              </span>
              <span className={cn('text-xs', accent ? 'text-blue-200' : 'text-[#94a3b8]')}>
                vs last month
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]',
              accent ? 'bg-white/15' : iconBg,
            )}
          >
            <Icon className={cn('h-5 w-5', accent ? 'text-white' : iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}
