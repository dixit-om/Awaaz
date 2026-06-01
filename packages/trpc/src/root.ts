import type { AuthService } from '@awaaz/auth';
import type { ComplaintService } from '@awaaz/complaints';
import { router } from './server';
import { createAuthRouter } from './routers/auth';
import { createComplaintsRouter } from './routers/complaints';
import { healthRouter } from './routers/health';

export interface AppServices {
  authService: AuthService;
  complaintService: ComplaintService;
}

/**
 * Build the root application router.
 * Called once at server startup with all domain services.
 */
export function createAppRouter(services: AppServices) {
  return router({
    health: healthRouter,
    auth: createAuthRouter(services.authService),
    complaints: createComplaintsRouter(services.complaintService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
