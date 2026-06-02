import type { AuthService } from '@awaaz/auth';
import type { ComplaintService } from '@awaaz/complaints';
import type { GeoService } from '@awaaz/geo';
import { router } from './server';
import { createAuthRouter } from './routers/auth';
import { createComplaintsRouter } from './routers/complaints';
import { createGeoRouter } from './routers/geo';
import { healthRouter } from './routers/health';

export interface AppServices {
  authService: AuthService;
  complaintService: ComplaintService;
  geoService: GeoService;
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
    geo: createGeoRouter(services.geoService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
