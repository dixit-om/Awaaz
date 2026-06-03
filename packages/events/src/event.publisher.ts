import { Queue } from 'bullmq';
import type { PrismaClient } from '@awaaz/db';
import type { DomainEvent } from './event.types.js';

// ---------------------------------------------------------------------------
// Queue configuration
// ---------------------------------------------------------------------------

export const NOTIFICATION_QUEUE_NAME = 'awaaz:notifications';

const DEFAULT_JOB_OPTIONS = {
  /**
   * Retry up to 3 times on transient failures (network blip, DB timeout).
   * Exponential backoff: 2s → 4s → 8s.
   */
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  /**
   * Keep the last 100 completed jobs for audit / debugging.
   * Failed jobs are never removed — they stay for manual inspection + replay.
   */
  removeOnComplete: { count: 100 },
  removeOnFail: false,
} as const;

// ---------------------------------------------------------------------------
// EventPublisher
// ---------------------------------------------------------------------------

/**
 * Publishes domain events to the BullMQ notifications queue.
 *
 * Each publish() call:
 *   1. Writes an EventLog row (status: PENDING) for auditability.
 *   2. Enqueues a BullMQ job — jobId = eventId (idempotency).
 *   3. Updates the EventLog with the BullMQ jobId.
 *
 * On enqueue failure:
 *   - EventLog is marked FAILED with the error message.
 *   - publish() does NOT throw — domain operations must not fail
 *     because of a notification system issue.
 *   - The FAILED EventLog row is the recovery point for Phase 5
 *     outbox-pattern replay.
 *
 * The NotificationConsumer (worker) marks EventLog status = PROCESSED
 * after successfully handling the job.
 */
export class EventPublisher {
  private readonly queue: Queue;

  constructor(
    redisUrl: string,
    private readonly db: PrismaClient,
  ) {
    // Parse the Redis URL into host/port/password so we never import
    // ioredis directly — BullMQ uses its own bundled version internally.
    // This avoids version-mismatch errors in pnpm monorepos.
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 6379,
      ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
      ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
      // Required by BullMQ — ioredis must not retry requests on connection loss
      maxRetriesPerRequest: null as unknown as number,
      enableReadyCheck: false,
    };

    this.queue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  /**
   * Publishes a domain event.
   * Fire-and-forget from the caller's perspective — never throws.
   */
  async publish(event: DomainEvent): Promise<void> {
    // 1. Write EventLog row (PENDING) — source of truth for outbox pattern
    let logId: string;
    try {
      const log = await this.db.eventLog.create({
        data: {
          id: event.eventId,
          eventType: event.eventType,
          // Prisma's InputJsonValue requires double-cast through unknown
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: event as any,
          status: 'PENDING',
        },
        select: { id: true },
      });
      logId = log.id;
    } catch (err) {
      // EventLog write failed — log and exit; don't attempt BullMQ enqueue
      console.error('[EventPublisher] Failed to write EventLog:', err);
      return;
    }

    // 2. Enqueue BullMQ job — use eventId as jobId for idempotency
    try {
      const job = await this.queue.add(event.eventType, event, {
        jobId: event.eventId,
      });

      // 3. Update EventLog with the resolved BullMQ job id
      await this.db.eventLog.update({
        where: { id: logId },
        data: { jobId: job.id ?? event.eventId },
      });
    } catch (err) {
      // Enqueue failed — mark EventLog as FAILED for later replay
      try {
        await this.db.eventLog.update({
          where: { id: logId },
          data: {
            status: 'FAILED',
            errorMsg: err instanceof Error ? err.message : String(err),
            attempts: 1,
          },
        });
      } catch {
        // Best-effort update — if even this fails, the PENDING row remains
        // and can be picked up by the Phase 5 outbox poller
      }
      console.error('[EventPublisher] Failed to enqueue event:', event.eventType, err);
    }
  }

  /**
   * Gracefully closes the queue connection.
   * Call this during server shutdown to drain in-flight publishes.
   */
  async close(): Promise<void> {
    await this.queue.close();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an EventPublisher connected to the given Redis URL.
 * Returns null if REDIS_URL is not configured — notifications are silently
 * skipped in development when Redis is not running.
 */
export function createEventPublisher(
  redisUrl: string | undefined,
  db: PrismaClient,
): EventPublisher | null {
  if (!redisUrl) {
    console.warn('[EventPublisher] REDIS_URL not set — event publishing disabled');
    return null;
  }
  return new EventPublisher(redisUrl, db);
}
