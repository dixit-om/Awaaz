import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { getClientEnv, getServerEnv } from '@awaaz/config';
import { appRouter } from '@awaaz/trpc';
import { createContext } from './trpc/context';

// Load .env from monorepo root
const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

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

app.listen(env.SERVER_PORT, () => {
  console.log(`🚀 AWAAZ API server running on ${env.SERVER_URL}/trpc`);
});
