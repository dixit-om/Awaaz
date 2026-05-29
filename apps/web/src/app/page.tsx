'use client';

import { trpc } from '@/trpc/client';

export default function HomePage() {
  const { data, isLoading, error } = trpc.health.ping.useQuery();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="border-border bg-card w-full max-w-lg rounded-xl border p-8 text-center">
        <h1 className="text-primary mb-2 text-3xl font-bold">AWAAZ</h1>
        <p className="text-muted-foreground mb-6">
          Civic Engagement &amp; Governance Transparency Platform
        </p>
        <div className="bg-muted rounded-lg p-4 text-sm">
          {isLoading && <p>Connecting to API…</p>}
          {error && <p className="text-red-400">API: {error.message}</p>}
          {data && (
            <p>
              API status: <span className="text-primary font-medium">{data.status}</span>
            </p>
          )}
        </div>
        <p className="text-muted-foreground mt-6 text-xs">
          Foundation setup — no business features yet
        </p>
      </div>
    </main>
  );
}
