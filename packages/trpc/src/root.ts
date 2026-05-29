import { router } from './trpc';
import { healthRouter } from './routers/health';

/**
 * Root application router.
 * Feature routers (auth, complaints, leaderboard, etc.) merge here.
 */
export const appRouter = router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
