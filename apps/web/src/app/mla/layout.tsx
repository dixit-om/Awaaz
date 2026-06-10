'use client';

import { AuthGuard } from '@/components/layout/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useCurrentUser } from '@/contexts/auth-context';
import { useNotificationNav } from '@/hooks/use-notification-nav';

function MLADashboardShell({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const nav = useNotificationNav('mla');
  return (
    <DashboardLayout
      role="mla"
      nav={nav}
      user={user ? { name: user.name ?? 'Authority', role: 'MLA' } : undefined}
    >
      {children}
    </DashboardLayout>
  );
}

export default function MLALayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="mla">
      <MLADashboardShell>{children}</MLADashboardShell>
    </AuthGuard>
  );
}
