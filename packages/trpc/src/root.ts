import type { AuthService } from '@awaaz/auth';
import type { ComplaintService } from '@awaaz/complaints';
import type { GeoService } from '@awaaz/geo';
import type { NotificationService } from '@awaaz/notifications';
import type { AnalyticsService } from '@awaaz/analytics';
import { router } from './server';
import { createAuthRouter } from './routers/auth';
import { createComplaintsRouter } from './routers/complaints';
import { createGeoRouter } from './routers/geo';
import { healthRouter } from './routers/health';
import { createNotificationsRouter } from './routers/notifications';
import { createAnalyticsRouter } from './routers/analytics';

export interface AppServices {
  authService: AuthService;
  complaintService: ComplaintService;
  geoService: GeoService;
  notificationService: NotificationService;
  analyticsService: AnalyticsService;
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
    analytics: createAnalyticsRouter(services.analyticsService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
