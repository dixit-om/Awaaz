import { Megaphone } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

/**
 * Full-page branded loading screen shown during:
 *   - Auth session bootstrap (AuthProvider resolving)
 *   - Route guard checks (AuthGuard)
 *   - Login page while redirect is in flight
 */
export function LoadingScreen({ message = 'Loading…' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8fafc]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e40af]">
        <Megaphone className="h-6 w-6 text-white" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e2e8f0] border-t-[#1e40af]" />
        <p className="text-sm text-[#94a3b8]">{message}</p>
      </div>
    </div>
  );
}
