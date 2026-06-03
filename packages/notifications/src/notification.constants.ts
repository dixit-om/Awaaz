import type { NotificationType } from '@awaaz/types';
import type {
  ComplaintAssignedPayload,
  ComplaintCreatedPayload,
  ComplaintRejectedPayload,
  ComplaintResolvedPayload,
  ComplaintStatusChangedPayload,
  ComplaintVerifiedPayload,
} from '@awaaz/events';

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const NOTIFICATION_ERROR = {
  NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  FORBIDDEN: 'NOTIFICATION_FORBIDDEN',
  PREFERENCE_NOT_FOUND: 'NOTIFICATION_PREFERENCE_NOT_FOUND',
} as const;

export type NotificationErrorCode = (typeof NOTIFICATION_ERROR)[keyof typeof NOTIFICATION_ERROR];

// ---------------------------------------------------------------------------
// Notification type labels (for logging / admin UI)
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  COMPLAINT_CREATED: 'Complaint Received',
  COMPLAINT_ASSIGNED: 'New Complaint Assigned',
  COMPLAINT_STATUS_UPDATED: 'Complaint Update',
  COMPLAINT_RESOLVED: 'Action Required',
  COMPLAINT_VERIFIED: 'Resolution Confirmed',
  COMPLAINT_REJECTED: 'Resolution Rejected',
  SYSTEM_ANNOUNCEMENT: 'System Announcement',
};

// ---------------------------------------------------------------------------
// Message template builders
//
// Each function accepts the event payload and returns { title, message }.
// Templates are intentionally concise — suitable for push notification
// character limits (iOS: 256 chars, Android: no hard limit but ~200 chars
// for good UX).
//
// Localisation: when i18n is added (Phase 6), replace these functions with
// a lookup into a translation key map using the same signature.
// ---------------------------------------------------------------------------

export type NotificationContent = { title: string; message: string };

export function buildComplaintCreatedContent(
  payload: ComplaintCreatedPayload,
): NotificationContent {
  return {
    title: 'Complaint Received',
    message: `Your complaint "${payload.title}" has been submitted successfully. We will assign it to the concerned authority shortly.`,
  };
}

export function buildComplaintAssignedContent(
  payload: ComplaintAssignedPayload,
): NotificationContent {
  const location = payload.constituencyName ? ` in ${payload.constituencyName}` : '';
  return {
    title: 'New Complaint Assigned',
    message: `A complaint "${payload.title}"${location} has been assigned to you. Please review and take action.`,
  };
}

export function buildComplaintStatusChangedContent(
  payload: ComplaintStatusChangedPayload,
): NotificationContent {
  const statusLabel = STATUS_DISPLAY_LABEL[payload.newStatus] ?? payload.newStatus;
  return {
    title: 'Complaint Update',
    message: `Your complaint "${payload.title}" status has been updated to ${statusLabel}.`,
  };
}

export function buildComplaintResolvedContent(
  payload: ComplaintResolvedPayload,
): NotificationContent {
  return {
    title: 'Action Required — Verify Resolution',
    message: `Your complaint "${payload.title}" has been marked as resolved. Please verify if the issue has been fixed or reject if it has not.`,
  };
}

export function buildComplaintVerifiedContent(
  payload: ComplaintVerifiedPayload,
): NotificationContent {
  return {
    title: 'Resolution Confirmed',
    message: `The citizen has confirmed that the complaint "${payload.title}" has been resolved. Thank you for your action.`,
  };
}

export function buildComplaintRejectedContent(
  payload: ComplaintRejectedPayload,
): NotificationContent {
  const remark = payload.remarks ? ` Reason: "${payload.remarks}"` : '';
  return {
    title: 'Resolution Rejected',
    message: `The citizen has rejected the resolution for "${payload.title}".${remark} Please review and resolve again.`,
  };
}

// ---------------------------------------------------------------------------
// Status display labels (used in message templates)
// ---------------------------------------------------------------------------

const STATUS_DISPLAY_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};
