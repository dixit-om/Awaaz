import { publicProcedure, router } from '../server';

export const healthRouter = router({
  ping: publicProcedure.query(() => ({
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  })),
});
