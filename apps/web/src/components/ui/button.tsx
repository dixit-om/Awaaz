import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-[10px] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2';

  const variants = {
    primary:
      'bg-[#1e40af] text-white hover:bg-[#1d4ed8] active:bg-[#1e3a8a] shadow-sm focus-visible:outline-[#1e40af]',
    secondary:
      'bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] active:bg-[#cbd5e1] focus-visible:outline-[#1e40af]',
    outline:
      'border border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc] hover:border-[#cbd5e1] focus-visible:outline-[#1e40af]',
    ghost: 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] focus-visible:outline-[#1e40af]',
    danger:
      'bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c] focus-visible:outline-[#ef4444]',
    accent:
      'bg-[#f59e0b] text-white hover:bg-[#d97706] active:bg-[#b45309] shadow-sm focus-visible:outline-[#f59e0b]',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
