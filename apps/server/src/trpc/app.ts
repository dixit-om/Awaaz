import '../load-env';
import { createAuthService } from '@awaaz/auth';
import { createComplaintService } from '@awaaz/complaints';
import { createGeoService } from '@awaaz/geo';
import { NotificationRepository, createNotificationService } from '@awaaz/notifications';
import { getAuthConfig, getServerEnv } from '@awaaz/config';
import { prisma } from '@awaaz/db';
import { createAppRouter } from '@awaaz/trpc';

const env = getServerEnv();

const authService = createAuthService(prisma, getAuthConfig());
const geoService = createGeoService(prisma);

// GeoService injected into ComplaintService so complaint creation
// automatically triggers constituency resolution and authority assignment.
const complaintService = createComplaintService(prisma, geoService);

// NotificationService requires Redis.  The worker is started here so it is
// alive for the lifetime of the server process.  If REDIS_URL is not set (e.g.
// local dev without Redis) the consumer simply never starts — in-app
// notifications are still written when events are processed later.
const notificationRepo = new NotificationRepository(prisma);
export const notificationService = createNotificationService(
  notificationRepo,
  env.REDIS_URL ?? 'redis://127.0.0.1:6379',
);

export const appRouter = createAppRouter({
  authService,
  complaintService,
  geoService,
  notificationService,
});
