import type { AuthService } from '@awaaz/auth';
import type { ComplaintService } from '@awaaz/complaints';
import type { GeoService } from '@awaaz/geo';
import type { NotificationService } from '@awaaz/notifications';
import { router } from './server';
import { createAuthRouter } from './routers/auth';
import { createComplaintsRouter } from './routers/complaints';
import { createGeoRouter } from './routers/geo';
import { healthRouter } from './routers/health';
import { createNotificationsRouter } from './routers/notifications';

export interface AppServices {
  authService: AuthService;
  complaintService: ComplaintService;
  geoService: GeoService;
  notificationService: NotificationService;
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
    notifications: createNotificationsRouter(services.notificationService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
