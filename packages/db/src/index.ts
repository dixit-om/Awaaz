import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma client for the AWAAZ monorepo.
 * Prevents multiple instances during hot reload in development.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export type {
  Prisma,
  User,
  UserRole,
  Complaint,
  ComplaintCategory,
  ComplaintMedia,
  ComplaintStatusHistory,
  ComplaintStatus,
  ComplaintPriority,
  MediaType,
  MediaUploadStatus,
  // Phase 3 — Geo
  Constituency,
  AuthorityAssignment,
  GeoBoundaryVersion,
  AssignmentSource,
  ConstituencyType,
  // Phase 4 — Notifications
  Notification,
  NotificationPreference,
  EventLog,
  NotificationType,
  EventStatus,
} from '@prisma/client';
