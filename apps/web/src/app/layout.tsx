import type { Metadata } from 'next';
import { TRPCProvider } from '@/trpc/provider';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWAAZ — Civic Engagement Platform',
  description: 'Citizen-driven civic issue reporting and governance transparency',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/*
         * TRPCProvider must wrap AuthProvider because AuthProvider
         * uses tRPC hooks (getCurrentUser, refreshToken).
         *
         * TRPCProvider reads tokens directly from localStorage via the
         * headers() callback — no circular dependency.
         */}
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
