import type { Metadata } from 'next';
import { TRPCProvider } from '@/trpc/provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWAAZ — Civic Engagement Platform',
  description: 'Citizen-driven civic issue reporting and governance transparency',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
