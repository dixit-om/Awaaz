/**
 * Shared utility functions for AWAAZ.
 */

/** Sleep helper for retries / testing */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Calculate total pages from total count and page size */
export function getTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit) || 0;
}
