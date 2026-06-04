import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function Input({ label, error, hint, prefix, suffix, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#0f172a]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="pointer-events-none absolute left-3 flex items-center text-[#64748b]">
            {prefix}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-[10px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a]',
            'placeholder:text-[#94a3b8]',
            'focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10',
            'transition-colors duration-200',
            'disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:opacity-60',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/10',
            prefix && 'pl-10',
            suffix && 'pr-10',
            className,
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 flex items-center text-[#64748b]">{suffix}</div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-[#64748b]">{hint}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#0f172a]">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full resize-none rounded-[10px] border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a]',
          'placeholder:text-[#94a3b8]',
          'focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10',
          'transition-colors duration-200',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-400/10',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-[#64748b]">{hint}</p>}
    </div>
  );
}
