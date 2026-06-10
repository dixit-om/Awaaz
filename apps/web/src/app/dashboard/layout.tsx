'use client';

import { AuthGuard } from '@/components/layout/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useCurrentUser } from '@/contexts/auth-context';
import { useNotificationNav } from '@/hooks/use-notification-nav';

function CitizenDashboardShell({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const nav = useNotificationNav('citizen');
  return (
    <DashboardLayout
      role="citizen"
      nav={nav}
      user={user ? { name: user.name ?? 'Citizen', role: 'citizen' } : undefined}
    >
      {children}
    </DashboardLayout>
  );
}

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="citizen">
      <CitizenDashboardShell>{children}</CitizenDashboardShell>
    </AuthGuard>
  );
}
