import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function MLALayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="mla" user={{ name: 'Suresh Gupta', role: 'MLA' }}>
      {children}
    </DashboardLayout>
  );
}
