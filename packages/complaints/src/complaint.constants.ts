import {
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  type ComplaintStatus,
  type ComplaintPriority,
  type UserRole,
} from '@awaaz/types';

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const COMPLAINT_ERROR = {
  NOT_FOUND: 'COMPLAINT_NOT_FOUND',
  FORBIDDEN: 'COMPLAINT_FORBIDDEN',
  INVALID_TRANSITION: 'COMPLAINT_INVALID_TRANSITION',
  NOT_ASSIGNED: 'COMPLAINT_NOT_ASSIGNED',
  REMARKS_REQUIRED: 'COMPLAINT_REMARKS_REQUIRED',
  CATEGORY_NOT_FOUND: 'COMPLAINT_CATEGORY_NOT_FOUND',
  CATEGORY_INACTIVE: 'COMPLAINT_CATEGORY_INACTIVE',
  MEDIA_REQUIRED: 'COMPLAINT_MEDIA_REQUIRED',
  ALREADY_TERMINAL: 'COMPLAINT_ALREADY_TERMINAL',
  ASSIGNEE_NOT_AUTHORITY: 'COMPLAINT_ASSIGNEE_NOT_AUTHORITY',
  DUPLICATE_STATUS: 'COMPLAINT_DUPLICATE_STATUS',
} as const;

export type ComplaintErrorCode = (typeof COMPLAINT_ERROR)[keyof typeof COMPLAINT_ERROR];

// ---------------------------------------------------------------------------
// Priority labels (UI / notifications)
// ---------------------------------------------------------------------------

export const PRIORITY_LABEL: Record<ComplaintPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

// ---------------------------------------------------------------------------
// Transition helpers (pure functions — no DB, no tRPC)
// ---------------------------------------------------------------------------

/**
 * Returns true if the status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: ComplaintStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Returns the roles that are allowed to move a complaint from
 * `currentStatus` to `newStatus`, or `null` if the transition is not defined.
 */
export function allowedRolesForTransition(
  currentStatus: ComplaintStatus,
  newStatus: ComplaintStatus,
): UserRole[] | null {
  const roles = ALLOWED_TRANSITIONS[currentStatus]?.[newStatus];
  return roles ?? null;
}

/**
 * Returns true if `role` may transition from `currentStatus` to `newStatus`.
 */
export function canTransition(
  role: UserRole,
  currentStatus: ComplaintStatus,
  newStatus: ComplaintStatus,
): boolean {
  const allowed = allowedRolesForTransition(currentStatus, newStatus);
  return allowed !== null && allowed.includes(role);
}

/**
 * Returns true if a citizen owns the complaint and may perform the transition.
 * Separation: ownership check is separate from role-permission check so the
 * service can give a clear 403 with the right error code in each case.
 */
export function isCitizenTransition(newStatus: ComplaintStatus): boolean {
  const roles = Object.values(ALLOWED_TRANSITIONS).flatMap((targets) =>
    Object.entries(targets)
      .filter(([to]) => to === newStatus)
      .flatMap(([, roles]) => roles),
  );
  return roles.includes('citizen');
}

/**
 * Returns a human-readable description of why a transition is invalid.
 * Used to build TRPCError messages.
 */
export function transitionErrorMessage(
  currentStatus: ComplaintStatus,
  newStatus: ComplaintStatus,
  role: UserRole,
): string {
  if (isTerminalStatus(currentStatus)) {
    return `Complaint is already in a terminal state (${currentStatus}) and cannot be changed`;
  }

  if (currentStatus === newStatus) {
    return `Complaint is already in status ${currentStatus}`;
  }

  const allowed = allowedRolesForTransition(currentStatus, newStatus);
  if (allowed === null) {
    return `Transition from ${currentStatus} to ${newStatus} is not allowed`;
  }

  return `Your role (${role}) is not permitted to move a complaint from ${currentStatus} to ${newStatus}`;
}

/**
 * Returns all valid next statuses for a given role and current status.
 * Useful for building UI dropdowns and tests.
 */
export function validNextStatuses(
  role: UserRole,
  currentStatus: ComplaintStatus,
): ComplaintStatus[] {
  const targets = ALLOWED_TRANSITIONS[currentStatus];
  return (Object.entries(targets) as [ComplaintStatus, UserRole[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([status]) => status);
}
