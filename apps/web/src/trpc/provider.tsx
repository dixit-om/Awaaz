'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, TRPCClientError } from '@trpc/client';
import superjson from 'superjson';
import { getAccessToken } from '@/lib/tokens';
import { trpc } from './client';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 2 minutes.
        staleTime: 2 * 60 * 1000,
        // Don't retry on auth errors — surface them immediately.
        retry: (failureCount, error) => {
          if (error instanceof TRPCClientError) {
            const code = error.data?.code as string | undefined;
            if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Singleton QueryClient for the browser (avoids recreating on HMR).
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new client (no shared state between requests).
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          transformer: superjson,
          // headers() is called on EVERY request — always reads the
          // current access token from localStorage, never stale.
          headers() {
            const token = getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
