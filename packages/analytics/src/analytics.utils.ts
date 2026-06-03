// ---------------------------------------------------------------------------
// Analytics utility functions — pure, no DB or tRPC dependencies
// ---------------------------------------------------------------------------

import {
  DEFAULT_DATE_RANGE_DAYS,
  MAX_DATE_RANGE_DAYS,
  RATE_DECIMAL_PLACES,
  DURATION_DECIMAL_PLACES,
} from './analytics.constants.js';
import type { DateRangeInput } from '@awaaz/types';

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a DateRangeInput into concrete start/end Date objects.
 *
 * Rules:
 *   - dateTo  defaults to now
 *   - dateFrom defaults to DEFAULT_DATE_RANGE_DAYS before dateTo
 *   - If the resolved range exceeds MAX_DATE_RANGE_DAYS, dateFrom is clamped
 *
 * The clamp is intentional: live aggregation across years is prohibitively
 * expensive. Callers that genuinely need all-time data should query
 * materialized view snapshots (Phase 7).
 */
export function resolveDateRange(input: DateRangeInput): {
  dateFrom: Date;
  dateTo: Date;
} {
  const dateTo = input.dateTo ? new Date(input.dateTo) : new Date();
  let dateFrom = input.dateFrom
    ? new Date(input.dateFrom)
    : new Date(dateTo.getTime() - DEFAULT_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000);

  const spanDays = (dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000);
  if (spanDays > MAX_DATE_RANGE_DAYS) {
    dateFrom = new Date(dateTo.getTime() - MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000);
  }

  return { dateFrom, dateTo };
}

/**
 * Returns the number of whole days between two dates.
 * Used for avgComplaintsPerDay calculation.
 */
export function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.max(1, Math.round(diff / (24 * 60 * 60 * 1000)));
}

/**
 * Formats an ISO 8601 datetime string as a Date.
 * Returns null on invalid input rather than throwing — the service handles nulls.
 */
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Rate / percentage calculations
// Centralised here to guarantee consistent rounding across all procedures.
// ---------------------------------------------------------------------------

/**
 * Computes numerator / denominator × 100, rounded to RATE_DECIMAL_PLACES.
 * Returns null (not 0 or NaN) when the denominator is 0 — the caller decides
 * how to present "no data" in the UI.
 */
export function safeRate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return round((numerator / denominator) * 100, RATE_DECIMAL_PLACES);
}

/**
 * Rounds a number to the specified decimal places.
 * Uses Math.round to avoid floating-point accumulation errors.
 */
export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Rounds a duration value (hours as float) to DURATION_DECIMAL_PLACES.
 * Returns null when the input is null/undefined — no-data propagation.
 */
export function roundDuration(value: number | null | undefined): number | null {
  if (value == null) return null;
  return round(value, DURATION_DECIMAL_PLACES);
}

/**
 * Converts a raw Postgres aggregate result (returned as a string by pg driver)
 * into a JavaScript number, or null if the string is null/empty.
 *
 * Prisma $queryRaw returns numeric aggregates as strings in Node.js because
 * JavaScript numbers cannot safely represent PostgreSQL's 64-bit integers or
 * high-precision decimals.
 */
export function parseNumeric(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

/**
 * Converts a BigInt (returned by Prisma $queryRaw COUNT(*)) to a regular
 * JavaScript number. COUNT results always fit in a 53-bit JS number for any
 * realistic dataset.
 */
export function parseBigInt(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  return 0;
}

// ---------------------------------------------------------------------------
// Governance threshold helpers
//
// Used by future leaderboard and dashboard colour-coding.
// Returns a signal level given a metric name and its current value.
// ---------------------------------------------------------------------------

import { GOVERNANCE_THRESHOLDS, type GovernanceThresholdKey } from './analytics.constants.js';

export type ThresholdSignal = 'green' | 'yellow' | 'red' | 'unknown';

/**
 * Returns a colour-coded signal for a governance metric value.
 *
 * For time-based metrics (avgResolutionTimeHours) lower is better:
 *   value <= TARGET  → green
 *   value <= ACCEPTABLE → yellow
 *   value >  ACCEPTABLE → red
 *
 * For rate-based metrics higher is better (all others in the threshold map):
 *   value >= TARGET  → green
 *   value >= ACCEPTABLE → yellow
 *   value <  ACCEPTABLE → red
 */
export function getThresholdSignal(
  key: GovernanceThresholdKey,
  value: number | null,
): ThresholdSignal {
  if (value == null) return 'unknown';

  const threshold = GOVERNANCE_THRESHOLDS[key];
  const lowerIsBetter = key === 'avgResolutionTimeHours';

  if (lowerIsBetter) {
    if (value <= threshold.TARGET) return 'green';
    if (value <= threshold.ACCEPTABLE) return 'yellow';
    return 'red';
  }

  if (value >= threshold.TARGET) return 'green';
  if (value >= threshold.ACCEPTABLE) return 'yellow';
  return 'red';
}

// ---------------------------------------------------------------------------
// SQL fragment builders
//
// Reusable parameterised SQL fragments used by analytics.repository.ts.
// Kept here so the repository stays focused on query structure, not
// repetitive string building.
// ---------------------------------------------------------------------------

/**
 * Builds the WHERE clause predicate for the complaints date window.
 * Returns a plain string fragment — caller is responsible for injecting
 * the dateFrom and dateTo values as bound parameters.
 *
 * Usage in $queryRaw:
 *   WHERE c.deleted_at IS NULL
 *     AND c.created_at >= ${dateFrom}
 *     AND c.created_at <= ${dateTo}
 */
export function complaintDateWhereClause(tableAlias = 'c'): string {
  return `${tableAlias}."deletedAt" IS NULL
    AND ${tableAlias}."createdAt" >= $1
    AND ${tableAlias}."createdAt" <= $2`;
}

/**
 * Appends a scope condition to the base WHERE clause.
 * Used to scope queries per role:
 *   - citizenId → CITIZEN role
 *   - constituencyId → MLA role
 *   - (no extra scope) → ADMIN role
 */
export function scopeCondition(
  tableAlias: string,
  field: 'citizenId' | 'constituencyId' | 'assignedAuthorityId',
  paramIndex: number,
): string {
  return `AND ${tableAlias}."${field}" = $${paramIndex}`;
}
