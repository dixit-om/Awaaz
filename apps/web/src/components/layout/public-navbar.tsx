'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Megaphone, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Explore', href: '/' },
  { label: 'Transparency', href: '/transparency' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'FAQ', href: '/faq' },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-[#0f172a]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e40af]">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg">AWAAZ</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm transition-colors duration-200',
                  pathname === link.href
                    ? 'bg-blue-50 font-medium text-[#1e40af]'
                    : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                <Megaphone className="h-4 w-4" />
                Report Issue
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9] md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="space-y-1 border-t border-[#e2e8f0] py-3 pb-4 md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block rounded-lg px-4 py-2.5 text-sm',
                  pathname === link.href
                    ? 'bg-blue-50 font-medium text-[#1e40af]'
                    : 'text-[#64748b]',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 px-4 pt-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button size="sm" className="w-full">
                  Report Issue
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
