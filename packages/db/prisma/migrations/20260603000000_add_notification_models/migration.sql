-- AWAAZ Migration: Phase 4 — Event System & Notifications

-- ---------------------------------------------------------------------------
-- New enums
-- ---------------------------------------------------------------------------

CREATE TYPE "NotificationType" AS ENUM (
  'COMPLAINT_CREATED',
  'COMPLAINT_ASSIGNED',
  'COMPLAINT_STATUS_UPDATED',
  'COMPLAINT_RESOLVED',
  'COMPLAINT_VERIFIED',
  'COMPLAINT_REJECTED',
  'SYSTEM_ANNOUNCEMENT'
);

-- EventStatus: used by EventLog for outbox-pattern delivery tracking
CREATE TYPE "EventStatus" AS ENUM (
  'PENDING',
  'PROCESSED',
  'FAILED',
  'DEAD'
);

-- ---------------------------------------------------------------------------
-- Notification
-- One row per user per event. isRead / readAt are the only mutable fields.
-- ---------------------------------------------------------------------------

CREATE TABLE "notifications" (
    "id"        TEXT             NOT NULL,
    "userId"    TEXT             NOT NULL,
    "type"      "NotificationType" NOT NULL,
    "title"     TEXT             NOT NULL,
    "message"   TEXT             NOT NULL,
    "metadata"  JSONB            NOT NULL DEFAULT '{}',
    "isRead"    BOOLEAN          NOT NULL DEFAULT false,
    "readAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Composite index: fetch all unread notifications for a user (badge count + list)
CREATE INDEX "notifications_userId_isRead_idx"
    ON "notifications"("userId", "isRead");

-- Composite index: chronological list per user
CREATE INDEX "notifications_userId_createdAt_idx"
    ON "notifications"("userId", "createdAt");

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- NotificationPreference
-- One row per user — upserted at first login / first notification event.
-- ---------------------------------------------------------------------------

CREATE TABLE "notification_preferences" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "inAppEnabled" BOOLEAN      NOT NULL DEFAULT true,
    "pushEnabled"  BOOLEAN      NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN      NOT NULL DEFAULT false,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_userId_key"
    ON "notification_preferences"("userId");

ALTER TABLE "notification_preferences"
    ADD CONSTRAINT "notification_preferences_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- EventLog
-- Append-only log of every domain event published by the system.
--
-- Phase 4: EventPublisher writes PENDING rows as a secondary write after
--          enqueueing the BullMQ job. Worker sets status = PROCESSED on
--          successful consumption.
--
-- Phase 5 (Outbox Pattern): a background poller reads PENDING rows and
--          enqueues BullMQ jobs, guaranteeing delivery even when Redis is
--          temporarily unavailable. Failed rows are retried and eventually
--          moved to DEAD for admin inspection.
-- ---------------------------------------------------------------------------

CREATE TABLE "event_logs" (
    "id"          TEXT          NOT NULL,
    "eventType"   TEXT          NOT NULL,
    "payload"     JSONB         NOT NULL,
    "status"      "EventStatus" NOT NULL DEFAULT 'PENDING',
    "jobId"       TEXT,
    "errorMsg"    TEXT,
    "attempts"    INTEGER       NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- Index for consumer queries: find PENDING events ordered by creation time
CREATE INDEX "event_logs_status_createdAt_idx"
    ON "event_logs"("status", "createdAt");

-- Index for admin queries: filter by event type + status (e.g. all FAILED complaint.created)
CREATE INDEX "event_logs_eventType_status_idx"
    ON "event_logs"("eventType", "status");
