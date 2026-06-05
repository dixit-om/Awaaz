'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Plus,
  FileText,
  Bell,
  BarChart2,
  Users,
  Megaphone,
  LogOut,
  HelpCircle,
  Map,
  Settings,
  Trophy,
  Shield,
  Image,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

/* ─── Citizen nav ───────────────────────────────────────────────────── */
export const CITIZEN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Reports', href: '/dashboard/complaints', icon: FileText },
  { label: 'Civic Map', href: '/dashboard/map', icon: Map },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Community', href: '/transparency', icon: Users },
  { label: 'Settings', href: '/dashboard/profile', icon: Settings },
];

/* ─── MLA nav ───────────────────────────────────────────────────────── */
export const MLA_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/mla', icon: LayoutDashboard },
  { label: 'Assigned Complaints', href: '/mla/complaints', icon: FileText },
  { label: 'Civic Map', href: '/mla/map', icon: Map },
  { label: 'Analytics', href: '/mla/analytics', icon: BarChart2 },
  { label: 'Notifications', href: '/mla/notifications', icon: Bell },
  { label: 'Profile', href: '/mla/profile', icon: Settings },
];

/* ─── Admin nav ─────────────────────────────────────────────────────── */
export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Complaints', href: '/admin/complaints', icon: FileText },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Media Moderation', href: '/admin/media', icon: Image },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
  { label: 'Leaderboards', href: '/admin/leaderboard', icon: Trophy },
  { label: 'Constituencies', href: '/admin/constituencies', icon: Building2 },
  { label: 'Authorities', href: '/admin/authorities', icon: Shield },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

interface SidebarProps {
  nav: NavItem[];
  user?: { name: string; role: string; phone?: string };
  showNewReport?: boolean;
}

export function Sidebar({ nav, user, showNewReport = false }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col overflow-y-auto bg-[#0f172a]">
      {/* Logo */}
      <div className="border-white/8 flex h-16 flex-shrink-0 items-center gap-2.5 border-b px-5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1e40af]">
          <Megaphone className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-base font-bold leading-tight text-white">AWAAZ</p>
          <p className="text-[10px] leading-tight text-[#475569]">Civic Engagement</p>
        </div>
      </div>

      {/* New Report CTA */}
      {showNewReport && (
        <div className="px-4 pt-4">
          <Link href="/dashboard/report">
            <button className="flex w-full items-center gap-2 rounded-[10px] bg-[#1e40af] px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#1d4ed8]">
              <Plus className="h-4 w-4" />
              New Report
            </button>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/mla' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm transition-all duration-200',
                active
                  ? 'bg-white/10 font-medium text-white'
                  : 'hover:bg-white/6 text-[#94a3b8] hover:text-white',
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-colors',
                  active ? 'text-white' : 'text-[#64748b] group-hover:text-[#94a3b8]',
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="min-w-[18px] rounded-full bg-[#1e40af] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-white/8 space-y-0.5 border-t px-3 pb-4 pt-4">
        <Link
          href="#"
          className="hover:bg-white/6 flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm text-[#94a3b8] transition-all duration-200 hover:text-white"
        >
          <HelpCircle className="h-4 w-4 text-[#64748b]" />
          Help Center
        </Link>
        <button
          onClick={logout}
          className="hover:bg-white/6 flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm text-[#94a3b8] transition-all duration-200 hover:text-white"
        >
          <LogOut className="h-4 w-4 text-[#64748b]" />
          Logout
        </button>

        {/* User */}
        {user && (
          <div className="bg-white/6 mt-3 flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors hover:bg-white/10">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user.name}</p>
              <p className="truncate text-[10px] capitalize text-[#64748b]">{user.role}</p>
            </div>
            <ChevronRight className="h-3 w-3 flex-shrink-0 text-[#475569]" />
          </div>
        )}
      </div>
    </aside>
  );
}
