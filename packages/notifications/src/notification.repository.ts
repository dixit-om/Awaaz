import type { PrismaClient, Prisma } from '@awaaz/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonInput = any;
import type {
  CreateNotificationData,
  GetNotificationsInput,
  MarkReadResult,
  NotificationItem,
  NotificationType,
  NotificationPreferenceItem,
} from '@awaaz/types';

// ---------------------------------------------------------------------------
// Prisma select fragment
// ---------------------------------------------------------------------------

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  metadata: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

type NotificationRow = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    isRead: row.isRead,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class NotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  // ------------------------------------------------------------------
  // Writes
  // ------------------------------------------------------------------

  /**
   * Creates a single notification row.
   * Called by the NotificationConsumer for each recipient of an event.
   */
  async create(data: CreateNotificationData): Promise<NotificationItem> {
    const row = await this.db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: (data.metadata ?? {}) as JsonInput,
      },
      select: notificationSelect,
    });
    return toNotificationItem(row);
  }

  /**
   * Bulk-creates notifications for multiple recipients in one transaction.
   * Used when a single event has more than one recipient
   * (e.g., complaint.assigned notifies both MLA and, in future, admin).
   */
  async createMany(items: CreateNotificationData[]): Promise<number> {
    const result = await this.db.notification.createMany({
      data: items.map((d) => ({
        userId: d.userId,
        type: d.type,
        title: d.title,
        message: d.message,
        metadata: (d.metadata ?? {}) as JsonInput,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  // ------------------------------------------------------------------
  // Reads
  // ------------------------------------------------------------------

  async list(
    userId: string,
    filters: GetNotificationsInput,
  ): Promise<{ items: NotificationItem[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters.unreadOnly ? { isRead: false } : {}),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.notification.findMany({
        where,
        select: notificationSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.notification.count({ where }),
    ]);

    return { items: rows.map(toNotificationItem), total };
  }

  async countUnread(userId: string): Promise<number> {
    return this.db.notification.count({
      where: { userId, isRead: false },
    });
  }

  async findById(id: string, userId: string): Promise<NotificationItem | null> {
    const row = await this.db.notification.findFirst({
      where: { id, userId },
      select: notificationSelect,
    });
    return row ? toNotificationItem(row) : null;
  }

  // ------------------------------------------------------------------
  // Mark read
  // ------------------------------------------------------------------

  async markAsRead(id: string, userId: string): Promise<MarkReadResult> {
    const result = await this.db.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  async markAllAsRead(userId: string): Promise<MarkReadResult> {
    const result = await this.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ------------------------------------------------------------------
  // Preferences
  // ------------------------------------------------------------------

  async findPreference(userId: string): Promise<NotificationPreferenceItem | null> {
    const row = await this.db.notificationPreference.findUnique({
      where: { userId },
      select: {
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        updatedAt: true,
      },
    });
    return row ?? null;
  }

  /**
   * Upserts the preference row for a user.
   * Called at first login and when the user changes their settings.
   */
  async upsertPreference(
    userId: string,
    data: Partial<{
      inAppEnabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    }>,
  ): Promise<NotificationPreferenceItem> {
    const row = await this.db.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        inAppEnabled: data.inAppEnabled ?? true,
        pushEnabled: data.pushEnabled ?? false,
        emailEnabled: data.emailEnabled ?? false,
      },
      update: {
        ...(data.inAppEnabled !== undefined ? { inAppEnabled: data.inAppEnabled } : {}),
        ...(data.pushEnabled !== undefined ? { pushEnabled: data.pushEnabled } : {}),
        ...(data.emailEnabled !== undefined ? { emailEnabled: data.emailEnabled } : {}),
      },
      select: {
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        updatedAt: true,
      },
    });
    return row;
  }

  // ------------------------------------------------------------------
  // EventLog helpers (used by NotificationConsumer)
  // ------------------------------------------------------------------

  /**
   * Marks an EventLog entry as PROCESSED after the consumer finishes.
   * Only updates if the current status is PENDING to prevent overwriting
   * a FAILED status set by a concurrent retry.
   */
  async markEventProcessed(eventLogId: string): Promise<void> {
    await this.db.eventLog.updateMany({
      where: { id: eventLogId, status: 'PENDING' },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  /**
   * Increments the attempt counter and records the failure reason.
   * After max retries, the consumer marks it DEAD.
   */
  async markEventFailed(eventLogId: string, errorMsg: string, isDead: boolean): Promise<void> {
    await this.db.eventLog.update({
      where: { id: eventLogId },
      data: {
        status: isDead ? 'DEAD' : 'FAILED',
        errorMsg,
        attempts: { increment: 1 },
      },
    });
  }
}
