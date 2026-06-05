'use client';

import { AuthGuard } from '@/components/layout/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useCurrentUser } from '@/contexts/auth-context';

function CitizenDashboardShell({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  return (
    <DashboardLayout
      role="citizen"
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
