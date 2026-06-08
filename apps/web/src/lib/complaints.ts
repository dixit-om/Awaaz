import type { ComplaintPriority, ComplaintStatus, UserRole } from '@awaaz/types';
import { ALLOWED_TRANSITIONS } from '@awaaz/types';

/** Human-readable status labels for the UI */
export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/** Status groups for filter tabs */
export const STATUS_GROUPS = {
  all: undefined,
  open: ['SUBMITTED', 'ASSIGNED'] as ComplaintStatus[],
  active: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] as ComplaintStatus[],
  in_progress: ['IN_PROGRESS'] as ComplaintStatus[],
  resolved: ['RESOLVED', 'VERIFIED'] as ComplaintStatus[],
  rejected: ['REJECTED'] as ComplaintStatus[],
} as const;

export type StatusGroup = keyof typeof STATUS_GROUPS;

export function formatComplaintId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Returns valid next statuses for a role given current status */
export function getValidNextStatuses(
  role: UserRole,
  currentStatus: ComplaintStatus,
): ComplaintStatus[] {
  const targets = ALLOWED_TRANSITIONS[currentStatus];
  return (Object.entries(targets) as [ComplaintStatus, UserRole[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([status]) => status);
}

export function isHighPriority(priority: ComplaintPriority): boolean {
  return priority === 'HIGH' || priority === 'URGENT';
}
