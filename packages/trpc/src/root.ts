import type { AuthService } from '@awaaz/auth';
import { router } from './server';
import { createAuthRouter } from './routers/auth';
import { healthRouter } from './routers/health';

/**
 * Build the root application router.
 * Called once at server startup with shared services.
 */
export function createAppRouter(authService: AuthService) {
  return router({
    health: healthRouter,
    auth: createAuthRouter(authService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
