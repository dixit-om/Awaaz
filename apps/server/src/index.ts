import './load-env';
import cors from 'cors';
import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { getClientEnv, getServerEnv } from '@awaaz/config';
import { appRouter } from './trpc/app';
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

app.listen(env.SERVER_PORT, () => {
  console.log(`🚀 AWAAZ API server running on ${env.SERVER_URL}/trpc`);
});
