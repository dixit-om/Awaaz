import '../load-env';
import { createAuthService } from '@awaaz/auth';
import { createComplaintService } from '@awaaz/complaints';
import { createGeoService } from '@awaaz/geo';
import { NotificationRepository, createNotificationService } from '@awaaz/notifications';
import { AnalyticsRepository, createAnalyticsService } from '@awaaz/analytics';
import { LeaderboardRepository, createLeaderboardService } from '@awaaz/leaderboard';
import { MediaRepository, createMediaService, createCloudinaryAdapter } from '@awaaz/media';
import { createEventPublisher } from '@awaaz/events';
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

// AnalyticsService is stateless — no workers, no extra connections beyond Prisma.
const analyticsRepo = new AnalyticsRepository(prisma);
const analyticsService = createAnalyticsService(analyticsRepo);

// LeaderboardService is stateless at boot time.
// Generation is triggered via BullMQ scheduled jobs (Phase 6+) or the
// admin triggerGeneration procedure. No workers started here.
const leaderboardRepo = new LeaderboardRepository(prisma);
const leaderboardService = createLeaderboardService(leaderboardRepo);

// MediaService wires together:
//   • MediaRepository     — Prisma CRUD for MediaAsset rows
//   • CloudinaryAdapter   — signs upload params, verifies uploads, revokes access
//   • EventPublisher      — fire-and-forget MEDIA_UPLOADED / MEDIA_DELETED events
//
// createCloudinaryAdapter() reads from env vars at startup and throws fast
// if CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are missing.
// createEventPublisher() returns null when REDIS_URL is unset (dev without Redis).
const mediaRepo = new MediaRepository(prisma);
const cloudinaryAdapter = createCloudinaryAdapter();
const mediaEventPublisher = createEventPublisher(env.REDIS_URL, prisma);
const mediaService = createMediaService(mediaRepo, cloudinaryAdapter, mediaEventPublisher);

export const appRouter = createAppRouter({
  authService,
  complaintService,
  geoService,
  notificationService,
  analyticsService,
  leaderboardService,
  mediaService,
});
