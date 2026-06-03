import './load-env';
import cors from 'cors';
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { getClientEnv, getServerEnv } from '@awaaz/config';
import { appRouter, notificationService } from './trpc/app';
import { createContext } from './trpc/context';

const env = getServerEnv();
const clientEnv = getClientEnv();
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

  // Start the BullMQ notification consumer after the HTTP server is ready.
  // If Redis is unavailable, the worker will log a connection error but the
  // HTTP server continues to serve requests normally.
  notificationService.startConsumer();
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
