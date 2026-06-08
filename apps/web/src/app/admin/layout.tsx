'use client';

import { AuthGuard } from '@/components/layout/auth-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useCurrentUser } from '@/contexts/auth-context';

function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  return (
    <DashboardLayout
      role="admin"
      user={user ? { name: user.name ?? 'Admin', role: 'Admin' } : undefined}
    >
      {children}
    </DashboardLayout>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="admin">
      <AdminDashboardShell>{children}</AdminDashboardShell>
    </AuthGuard>
  );
}
