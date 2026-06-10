import { Sidebar, type NavItem } from './sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role?: 'citizen' | 'mla' | 'admin';
  nav: NavItem[];
  user?: { name: string; role: string };
}

export function DashboardLayout({ children, role = 'citizen', nav, user }: DashboardLayoutProps) {
  const showNewReport = role === 'citizen';

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar nav={nav} user={user} showNewReport={showNewReport} />
      <main className={cn('ml-[220px] min-h-screen flex-1 overflow-y-auto')}>{children}</main>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}

export function PageHeader({ title, subtitle, children, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-8 pb-6 pt-8">
      <div>
        {breadcrumb && (
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-[#94a3b8]">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span>›</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="transition-colors hover:text-[#64748b]">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-[#64748b]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold text-[#0f172a]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
