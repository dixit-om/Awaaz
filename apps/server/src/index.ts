import './load-env';
import cors from 'cors';
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { getAuthConfig, getClientEnv, getServerEnv } from '@awaaz/config';
import { appRouter, notificationService } from './trpc/app';
import { createContext } from './trpc/context';

const env = getServerEnv();
const clientEnv = getClientEnv();
const authConfig = getAuthConfig();

if (authConfig.OTP_DEV_MODE) {
  console.log(
    '✓ OTP dev mode — codes print as [AWAAZ OTP] <phone> → <code> in this terminal (bypass: 000000)',
  );
}
const app = express();

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', clientEnv.NEXT_PUBLIC_APP_URL],
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'awaaz-server' });
});

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

const server = app.listen(env.SERVER_PORT, () => {
  console.log(`🚀 AWAAZ API server running on ${env.SERVER_URL}/trpc`);

  // Only start the BullMQ notification consumer when Redis is explicitly
  // configured. Without Redis the server still handles all tRPC requests;
  // only real-time event-driven notifications are unavailable.
  if (env.REDIS_URL) {
    notificationService.startConsumer();
  } else {
    console.warn('⚠️  REDIS_URL not set — notification consumer disabled (development mode)');
  }
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// Stops accepting new connections, drains in-flight requests, closes the
// BullMQ worker (waits for the current job to finish), then exits.
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  console.log(`\n[Server] ${signal} received — shutting down gracefully…`);

  server.close(async () => {
    try {
      await notificationService.stopConsumer();
      console.log('[Server] Notification consumer stopped.');
    } catch (err) {
      console.error('[Server] Error stopping notification consumer:', err);
    }
    console.log('[Server] HTTP server closed. Exiting.');
    process.exit(0);
  });

  // Force-exit after 10 s if graceful shutdown stalls (e.g. hung BullMQ job)
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timeout — forcing exit.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
