import { Worker } from 'bullmq';
import { TRPCError } from '@trpc/server';

import type {
  GetNotificationsInput,
  MarkAsReadInput,
  MarkReadResult,
  NotificationItem,
  NotificationPreferenceItem,
  UnreadCountResult,
} from '@awaaz/types';
import {
  EVENT_TYPE,
  type DomainEvent,
  type ComplaintCreatedPayload,
  type ComplaintAssignedPayload,
  type ComplaintStatusChangedPayload,
  type ComplaintResolvedPayload,
  type ComplaintVerifiedPayload,
  type ComplaintRejectedPayload,
} from '@awaaz/events';

import { NOTIFICATION_ERROR } from './notification.constants.js';
import {
  buildComplaintAssignedContent,
  buildComplaintCreatedContent,
  buildComplaintRejectedContent,
  buildComplaintResolvedContent,
  buildComplaintStatusChangedContent,
  buildComplaintVerifiedContent,
} from './notification.constants.js';
import type { NotificationRepository } from './notification.repository.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** BullMQ queue name — must match EventPublisher.QUEUE_NAME */
const AWAAZ_EVENTS_QUEUE = 'awaaz-events';

// ---------------------------------------------------------------------------
// Notification Service
//
// Two responsibilities:
//   1. NotificationConsumer — a BullMQ Worker that processes domain events
//      and converts them into in-app Notification rows.
//   2. NotificationService — tRPC-facing business logic for reading and
//      managing notifications (list, mark-read, preferences).
//
// The consumer is started lazily via startConsumer() so that the server can
// boot without Redis if Redis is not needed (e.g. during CI typechecks or
// migrations).
// ---------------------------------------------------------------------------

export class NotificationService {
  private worker: Worker | null = null;

  constructor(
    private readonly repo: NotificationRepository,
    private readonly redisUrl: string,
  ) {}

  // =========================================================================
  // 1. BullMQ Consumer
  // =========================================================================

  /**
   * Starts the BullMQ worker.  Call once during server boot.
   *
   * The worker:
   *   - Listens on the 'awaaz-events' queue
   *   - Dispatches each event to the appropriate handler
   *   - On success marks the EventLog PROCESSED
   *   - On failure marks the EventLog FAILED / DEAD (after max retries)
   *
   * BullMQ built-in retry logic is respected — the worker does NOT manage
   * retries itself; it simply throws on unexpected errors so BullMQ can
   * re-queue the job according to the JobOptions set by EventPublisher.
   */
  startConsumer(): void {
    if (this.worker) return; // already started

    const redisConnection = this.parseRedisUrl(this.redisUrl);

    this.worker = new Worker(
      AWAAZ_EVENTS_QUEUE,
      async (job) => {
        const event = job.data as DomainEvent;
        const eventLogId: string | undefined = job.opts?.jobId
          ? undefined
          : (job.data as { eventLogId?: string }).eventLogId;

        try {
          await this.dispatchEvent(event);

          if (eventLogId) {
            await this.repo.markEventProcessed(eventLogId);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          const isDead = (job.opts?.attempts ?? 1) <= 1;

          if (eventLogId) {
            await this.repo.markEventFailed(eventLogId, errorMsg, isDead);
          }

          // Re-throw so BullMQ can schedule retry / move to DLQ
          throw err;
        }
      },
      { connection: redisConnection },
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[NotificationConsumer] Job ${job?.id ?? 'unknown'} failed:`, err.message);
    });

    console.log('[NotificationConsumer] Worker started on queue:', AWAAZ_EVENTS_QUEUE);
  }

  /**
   * Gracefully shuts down the worker.  Call during server SIGTERM.
   */
  async stopConsumer(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      console.log('[NotificationConsumer] Worker stopped.');
    }
  }

  // ---------------------------------------------------------------------------
  // Event dispatcher
  // ---------------------------------------------------------------------------

  /**
   * Routes an incoming domain event to the correct handler.
   * Adding a new event type: add a case here and a handler below.
   */
  private async dispatchEvent(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case EVENT_TYPE.COMPLAINT_CREATED:
        await this.handleComplaintCreated(event.payload);
        break;
      case EVENT_TYPE.COMPLAINT_ASSIGNED:
        await this.handleComplaintAssigned(event.payload);
        break;
      case EVENT_TYPE.COMPLAINT_STATUS_CHANGED:
        await this.handleComplaintStatusChanged(event.payload);
        break;
      case EVENT_TYPE.COMPLAINT_RESOLVED:
        await this.handleComplaintResolved(event.payload);
        break;
      case EVENT_TYPE.COMPLAINT_VERIFIED:
        await this.handleComplaintVerified(event.payload);
        break;
      case EVENT_TYPE.COMPLAINT_REJECTED:
        await this.handleComplaintRejected(event.payload);
        break;
      // Phase 7 — Media events: no user notification needed at this time.
      // These events are consumed by the moderation queue and analytics pipeline.
      case EVENT_TYPE.MEDIA_UPLOADED:
      case EVENT_TYPE.MEDIA_DELETED:
        break;
      default: {
        // Exhaustive check — TypeScript will warn if a new event type is
        // added to DomainEvent without a case above.
        const _exhaustive: never = event;
        console.warn(
          '[NotificationConsumer] Unknown event type:',
          (_exhaustive as DomainEvent).eventType,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Per-event handlers
  // ---------------------------------------------------------------------------

  private async handleComplaintCreated(payload: ComplaintCreatedPayload): Promise<void> {
    const { title, message } = buildComplaintCreatedContent(payload);
    await this.repo.create({
      userId: payload.citizenId,
      type: 'COMPLAINT_CREATED',
      title,
      message,
      metadata: { complaintId: payload.complaintId },
    });
  }

  private async handleComplaintAssigned(payload: ComplaintAssignedPayload): Promise<void> {
    const { title, message } = buildComplaintAssignedContent(payload);
    await this.repo.create({
      userId: payload.authorityId,
      type: 'COMPLAINT_ASSIGNED',
      title,
      message,
      metadata: {
        complaintId: payload.complaintId,
        constituencyName: payload.constituencyName,
        assignmentSource: payload.assignmentSource,
      },
    });
  }

  private async handleComplaintStatusChanged(
    payload: ComplaintStatusChangedPayload,
  ): Promise<void> {
    const { title, message } = buildComplaintStatusChangedContent(payload);
    // Citizen gets notified about their complaint's progress
    await this.repo.create({
      userId: payload.citizenId,
      type: 'COMPLAINT_STATUS_UPDATED',
      title,
      message,
      metadata: {
        complaintId: payload.complaintId,
        previousStatus: payload.previousStatus,
        newStatus: payload.newStatus,
      },
    });
  }

  private async handleComplaintResolved(payload: ComplaintResolvedPayload): Promise<void> {
    const { title, message } = buildComplaintResolvedContent(payload);
    // Citizen must verify or reject
    await this.repo.create({
      userId: payload.citizenId,
      type: 'COMPLAINT_RESOLVED',
      title,
      message,
      metadata: { complaintId: payload.complaintId },
    });
  }

  private async handleComplaintVerified(payload: ComplaintVerifiedPayload): Promise<void> {
    const { title, message } = buildComplaintVerifiedContent(payload);
    // Authority gets positive confirmation
    await this.repo.create({
      userId: payload.authorityId,
      type: 'COMPLAINT_VERIFIED',
      title,
      message,
      metadata: { complaintId: payload.complaintId },
    });
  }

  private async handleComplaintRejected(payload: ComplaintRejectedPayload): Promise<void> {
    if (!payload.authorityId) return; // no authority to notify

    const { title, message } = buildComplaintRejectedContent(payload);
    await this.repo.create({
      userId: payload.authorityId,
      type: 'COMPLAINT_REJECTED',
      title,
      message,
      metadata: {
        complaintId: payload.complaintId,
        remarks: payload.remarks,
      },
    });
  }

  // =========================================================================
  // 2. tRPC-facing API
  // =========================================================================

  async getNotifications(
    userId: string,
    input: GetNotificationsInput,
  ): Promise<{ items: NotificationItem[]; total: number }> {
    return this.repo.list(userId, input);
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResult> {
    const count = await this.repo.countUnread(userId);
    return { count };
  }

  async markAsRead(userId: string, input: MarkAsReadInput): Promise<MarkReadResult> {
    const notification = await this.repo.findById(input.id, userId);
    if (!notification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: NOTIFICATION_ERROR.NOT_FOUND,
      });
    }
    return this.repo.markAsRead(input.id, userId);
  }

  async markAllAsRead(userId: string): Promise<MarkReadResult> {
    return this.repo.markAllAsRead(userId);
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceItem> {
    const pref = await this.repo.findPreference(userId);
    // Return sensible defaults if user has never updated preferences
    return (
      pref ?? {
        inAppEnabled: true,
        pushEnabled: false,
        emailEnabled: false,
        updatedAt: new Date(0),
      }
    );
  }

  async updatePreferences(
    userId: string,
    data: Partial<{
      inAppEnabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
    }>,
  ): Promise<NotificationPreferenceItem> {
    return this.repo.upsertPreference(userId, data);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Parses a Redis URL string into a BullMQ-compatible connection config.
   * Format: redis[s]://[:password@]host[:port][/db]
   */
  private parseRedisUrl(url: string): {
    host: string;
    port: number;
    password?: string;
  } {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || '127.0.0.1',
        port: parseInt(parsed.port || '6379', 10),
        ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
      };
    } catch {
      return { host: '127.0.0.1', port: 6379 };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createNotificationService(
  repo: NotificationRepository,
  redisUrl: string,
): NotificationService {
  return new NotificationService(repo, redisUrl);
}
