// Event type contracts
export {
  EVENT_TYPE,
  buildEvent,
  type EventType,
  type BaseEvent,
  type DomainEvent,
  // Payload interfaces
  type ComplaintCreatedPayload,
  type ComplaintAssignedPayload,
  type ComplaintStatusChangedPayload,
  type ComplaintResolvedPayload,
  type ComplaintVerifiedPayload,
  type ComplaintRejectedPayload,
  // Typed event aliases
  type ComplaintCreatedEvent,
  type ComplaintAssignedEvent,
  type ComplaintStatusChangedEvent,
  type ComplaintResolvedEvent,
  type ComplaintVerifiedEvent,
  type ComplaintRejectedEvent,
} from './event.types.js';

// Publisher
export {
  EventPublisher,
  createEventPublisher,
  NOTIFICATION_QUEUE_NAME,
} from './event.publisher.js';
