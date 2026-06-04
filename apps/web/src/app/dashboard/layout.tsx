import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="citizen" user={{ name: 'Aarav Sharma', role: 'citizen' }}>
      {children}
    </DashboardLayout>
  );
}
