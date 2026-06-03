// ---------------------------------------------------------------------------
// Notification Domain — App-level types (Phase 4)
// Mirrored from Prisma enums — decoupled from @prisma/client
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'COMPLAINT_CREATED'
  | 'COMPLAINT_ASSIGNED'
  | 'COMPLAINT_STATUS_UPDATED'
  | 'COMPLAINT_RESOLVED'
  | 'COMPLAINT_VERIFIED'
  | 'COMPLAINT_REJECTED'
  | 'SYSTEM_ANNOUNCEMENT';

// ---------------------------------------------------------------------------
// Notification item — returned in list and detail responses
// ---------------------------------------------------------------------------

/**
 * A single notification as returned to the client.
 * The `metadata` field carries structured context for deep-linking:
 *   { complaintId: string, status?: string, constituencyName?: string }
 */
export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** JSON metadata for deep-linking in the frontend (complaint id, etc.) */
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** Returned by getUnreadCount */
export type UnreadCountResult = {
  count: number;
};

/** Returned by markAsRead / markAllAsRead */
export type MarkReadResult = {
  updated: number;
};

// ---------------------------------------------------------------------------
// Notification preference
// ---------------------------------------------------------------------------

export type NotificationPreferenceItem = {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  updatedAt: Date;
};

// ---------------------------------------------------------------------------
// Input types (mirrored from validation schemas)
// ---------------------------------------------------------------------------

export type GetNotificationsInput = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

export type MarkAsReadInput = {
  id: string;
};

// ---------------------------------------------------------------------------
// Internal type used between consumer and repository
// ---------------------------------------------------------------------------

/** Data shape written to the notifications table by the consumer */
export type CreateNotificationData = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};
