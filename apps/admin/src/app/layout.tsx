import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWAAZ Admin',
  description: 'AWAAZ administration panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
