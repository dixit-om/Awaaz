import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const BG_COLOURS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getColour(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BG_COLOURS[Math.abs(hash) % BG_COLOURS.length] ?? BG_COLOURS[0]!;
}

export function Avatar({ name = 'User', src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={64}
        height={64}
        className={cn('flex-shrink-0 rounded-full object-cover', SIZES[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex flex-shrink-0 select-none items-center justify-center rounded-full font-semibold',
        SIZES[size],
        getColour(name),
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
