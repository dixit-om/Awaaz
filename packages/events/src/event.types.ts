// ---------------------------------------------------------------------------
// Domain Events — AWAAZ Event System (Phase 4)
//
// All domain events follow a BaseEvent<TType, TPayload> contract:
//   - eventId:    CUID — idempotency key for deduplication
//   - eventType:  string literal — used as BullMQ job name + EventLog key
//   - version:    schema version — allows payload migration without breaking consumers
//   - occurredAt: wall-clock time of the triggering action
//   - payload:    event-specific structured data
//
// Adding a new event:
//   1. Add a key to EVENT_TYPE
//   2. Define the *Payload interface
//   3. Define the *Event type using BaseEvent<>
//   4. Add it to the DomainEvent union
//   5. Add a case to createEvent<>
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Event type constants
// ---------------------------------------------------------------------------

export const EVENT_TYPE = {
  COMPLAINT_CREATED: 'complaint.created',
  COMPLAINT_ASSIGNED: 'complaint.assigned',
  COMPLAINT_STATUS_CHANGED: 'complaint.status_changed',
  COMPLAINT_RESOLVED: 'complaint.resolved',
  COMPLAINT_VERIFIED: 'complaint.verified',
  COMPLAINT_REJECTED: 'complaint.rejected',
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

// ---------------------------------------------------------------------------
// Base event shape
// ---------------------------------------------------------------------------

export interface BaseEvent<TType extends EventType, TPayload> {
  /** CUID — idempotency key. BullMQ job id = eventId. */
  eventId: string;
  eventType: TType;
  /** Semantic schema version — bump when payload fields change. */
  version: '1.0';
  /** Timestamp of the triggering action (not enqueue time). */
  occurredAt: Date;
  payload: TPayload;
}

// ---------------------------------------------------------------------------
// Event payload interfaces
// ---------------------------------------------------------------------------

/**
 * Emitted immediately after a citizen creates a complaint.
 * Recipient: citizen (confirmation).
 */
export interface ComplaintCreatedPayload {
  complaintId: string;
  citizenId: string;
  title: string;
  categoryName: string;
  address: string | null;
  priority: string;
}

/**
 * Emitted when a complaint is assigned to an MLA/authority.
 * Covers both AUTO (geo lookup) and MANUAL (admin override) assignment.
 * Recipient: assigned authority.
 */
export interface ComplaintAssignedPayload {
  complaintId: string;
  citizenId: string;
  authorityId: string;
  title: string;
  categoryName: string;
  constituencyName: string | null;
  address: string | null;
  /** 'AUTO' | 'MANUAL' — for notification message customisation */
  assignmentSource: string;
}

/**
 * Emitted for every status transition that is not a terminal event.
 * Specifically: SUBMITTED→ASSIGNED, ASSIGNED→IN_PROGRESS.
 * Terminal transitions (RESOLVED, VERIFIED, REJECTED) have dedicated events.
 * Recipient: citizen.
 */
export interface ComplaintStatusChangedPayload {
  complaintId: string;
  citizenId: string;
  authorityId: string | null;
  title: string;
  previousStatus: string;
  newStatus: string;
  /** Role string of the user who triggered the change */
  changedByRole: string;
}

/**
 * Emitted when an MLA/admin marks a complaint as RESOLVED.
 * Citizen must now VERIFY or REJECT the resolution.
 * Recipient: citizen (action required).
 */
export interface ComplaintResolvedPayload {
  complaintId: string;
  citizenId: string;
  authorityId: string;
  title: string;
  address: string | null;
}

/**
 * Emitted when the citizen VERIFIES the resolution.
 * Recipient: assigned authority (positive confirmation).
 */
export interface ComplaintVerifiedPayload {
  complaintId: string;
  citizenId: string;
  authorityId: string;
  title: string;
}

/**
 * Emitted when the citizen REJECTS the resolution.
 * Recipient: assigned authority (must re-resolve).
 */
export interface ComplaintRejectedPayload {
  complaintId: string;
  citizenId: string;
  authorityId: string | null;
  title: string;
  /** Citizen's rejection reason, if provided */
  remarks: string | null;
}

// ---------------------------------------------------------------------------
// Typed event aliases
// ---------------------------------------------------------------------------

export type ComplaintCreatedEvent = BaseEvent<
  typeof EVENT_TYPE.COMPLAINT_CREATED,
  ComplaintCreatedPayload
>;

export type ComplaintAssignedEvent = BaseEvent<
  typeof EVENT_TYPE.COMPLAINT_ASSIGNED,
  ComplaintAssignedPayload
>;

export type ComplaintStatusChangedEvent = BaseEvent<
  typeof EVENT_TYPE.COMPLAINT_STATUS_CHANGED,
  ComplaintStatusChangedPayload
>;

export type ComplaintResolvedEvent = BaseEvent<
  typeof EVENT_TYPE.COMPLAINT_RESOLVED,
  ComplaintResolvedPayload
>;

export type ComplaintVerifiedEvent = BaseEvent<
  typeof EVENT_TYPE.COMPLAINT_VERIFIED,
  ComplaintVerifiedPayload
>;

export type ComplaintRejectedEvent = BaseEvent<
  typeof EVENT_TYPE.COMPLAINT_REJECTED,
  ComplaintRejectedPayload
>;

/** Discriminated union of all AWAAZ domain events. */
export type DomainEvent =
  | ComplaintCreatedEvent
  | ComplaintAssignedEvent
  | ComplaintStatusChangedEvent
  | ComplaintResolvedEvent
  | ComplaintVerifiedEvent
  | ComplaintRejectedEvent;

// ---------------------------------------------------------------------------
// Event factory helper
// ---------------------------------------------------------------------------

/**
 * Creates a fully-formed domain event.
 * Caller provides eventType + payload; eventId, version, and occurredAt
 * are generated automatically.
 *
 * Usage:
 *   const event = buildEvent(EVENT_TYPE.COMPLAINT_CREATED, {
 *     complaintId: 'abc',
 *     citizenId: 'xyz',
 *     ...
 *   });
 */
export function buildEvent<TType extends EventType, TPayload>(
  eventType: TType,
  payload: TPayload,
  eventId: string,
): BaseEvent<TType, TPayload> {
  return {
    eventId,
    eventType,
    version: '1.0',
    occurredAt: new Date(),
    payload,
  };
}
