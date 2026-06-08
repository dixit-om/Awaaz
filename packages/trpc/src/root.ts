import type { AuthService, UserService } from '@awaaz/auth';
import type { ComplaintService } from '@awaaz/complaints';
import type { GeoService } from '@awaaz/geo';
import type { NotificationService } from '@awaaz/notifications';
import type { AnalyticsService } from '@awaaz/analytics';
import type { LeaderboardService } from '@awaaz/leaderboard';
import type { MediaService } from '@awaaz/media';
import { router } from './server';
import { createAuthRouter } from './routers/auth';
import { createComplaintsRouter } from './routers/complaints';
import { createGeoRouter } from './routers/geo';
import { healthRouter } from './routers/health';
import { createNotificationsRouter } from './routers/notifications';
import { createAnalyticsRouter } from './routers/analytics';
import { createLeaderboardRouter } from './routers/leaderboard';
import { createMediaRouter } from './routers/media';
import { createUsersRouter } from './routers/users';

export interface AppServices {
  authService: AuthService;
  userService: UserService;
  complaintService: ComplaintService;
  geoService: GeoService;
  notificationService: NotificationService;
  analyticsService: AnalyticsService;
  leaderboardService: LeaderboardService;
  mediaService: MediaService;
}

/**
 * Build the root application router.
 * Called once at server startup with all domain services.
 */
export function createAppRouter(services: AppServices) {
  return router({
    health: healthRouter,
    auth: createAuthRouter(services.authService),
    users: createUsersRouter(services.userService),
    complaints: createComplaintsRouter(services.complaintService),
    geo: createGeoRouter(services.geoService),
    notifications: createNotificationsRouter(services.notificationService),
    analytics: createAnalyticsRouter(services.analyticsService),
    leaderboard: createLeaderboardRouter(services.leaderboardService),
    media: createMediaRouter(services.mediaService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
