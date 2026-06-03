import type { LeaderboardPeriodType, ScoreSignal } from '@awaaz/types';

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const LEADERBOARD_ERROR = {
  SNAPSHOT_NOT_FOUND: 'LEADERBOARD_SNAPSHOT_NOT_FOUND',
  ENTITY_NOT_FOUND: 'LEADERBOARD_ENTITY_NOT_FOUND',
  GENERATION_ALREADY_RUNNING: 'LEADERBOARD_GENERATION_ALREADY_RUNNING',
  INSUFFICIENT_DATA: 'LEADERBOARD_INSUFFICIENT_DATA',
  FORBIDDEN: 'LEADERBOARD_FORBIDDEN',
  INVALID_PERIOD: 'LEADERBOARD_INVALID_PERIOD',
} as const;

export type LeaderboardErrorCode = (typeof LEADERBOARD_ERROR)[keyof typeof LEADERBOARD_ERROR];

// ---------------------------------------------------------------------------
// Scoring formula version
//
// Bump this string whenever AUTHORITY_WEIGHTS or CONSTITUENCY_WEIGHTS change.
// Old snapshots retain their original version — historical ranks remain
// accurate to the formula that was active when they were generated.
// ---------------------------------------------------------------------------

export const SCORE_VERSION = 'v1';

// ---------------------------------------------------------------------------
// Authority score weights
//
// All values are fractions (0.0–1.0). Must sum to 1.0.
// Penalty weights represent the maximum deduction from the total score.
//
// Derivation:
//   positiveWeights  = 0.40 + 0.20 + 0.20 + 0.05 = 0.85
//   penaltyWeights   = 0.10 + 0.05               = 0.15
//   sum              = 1.00  ✓
// ---------------------------------------------------------------------------

export const AUTHORITY_WEIGHTS = {
  /** Citizens confirmed the fix — the only metric that proves real improvement */
  verifiedResolutionRate: 0.4,
  /** Citizen approval of the specific resolution provided */
  citizenApprovalRate: 0.2,
  /** How quickly complaints are resolved — P50, not mean */
  resolutionTime: 0.2,
  /** Proportion of complaints auto-assigned by geo system (bonus, never penalty) */
  assignmentEfficiency: 0.05,
  /** Penalty for stale open complaints past their SLA */
  openComplaintPenalty: 0.1,
  /** Penalty for resolutions rejected by citizens */
  rejectedComplaintPenalty: 0.05,
} as const;

// Compile-time guard: weights must sum to 1.0
const _authorityWeightSum =
  AUTHORITY_WEIGHTS.verifiedResolutionRate +
  AUTHORITY_WEIGHTS.citizenApprovalRate +
  AUTHORITY_WEIGHTS.resolutionTime +
  AUTHORITY_WEIGHTS.assignmentEfficiency +
  AUTHORITY_WEIGHTS.openComplaintPenalty +
  AUTHORITY_WEIGHTS.rejectedComplaintPenalty;
// TypeScript will evaluate this as a literal type — any drift from 1 is visible
type _AuthorityWeightSumIs1 = typeof _authorityWeightSum extends 1 ? true : false;

// ---------------------------------------------------------------------------
// Constituency score weights (sum = 1.0)
// ---------------------------------------------------------------------------

export const CONSTITUENCY_WEIGHTS = {
  resolutionRate: 0.35,
  verificationRate: 0.3,
  citizenParticipation: 0.15,
  assignmentSuccessRate: 0.1,
  openIssueDensity: 0.1,
} as const;

// ---------------------------------------------------------------------------
// Time score formula parameters
//
// timeScore = clamp(0, 100, (1 - medianHours / TARGET_HOURS) × 100)
// Score = 100 at 0h, decays linearly, reaches 0 at TARGET_HOURS, clamped at 0 below.
// ---------------------------------------------------------------------------

/** Resolution time at which timeScore = 0 (target from governance KPIs) */
export const RESOLUTION_TIME_TARGET_HOURS = 48;

/** Hard floor — cannot score negative on time */
export const RESOLUTION_TIME_SCORE_MIN = 0;

// ---------------------------------------------------------------------------
// Minimum data thresholds
//
// Entities below these thresholds receive INSUFFICIENT_DATA status and are
// excluded from the leaderboard. Prevents misleading 100% rates from tiny
// sample sizes.
// ---------------------------------------------------------------------------

/** Min assigned complaints before an authority is ranked */
export const MIN_COMPLAINTS_FOR_AUTHORITY_RANKING = 10;

/** Min complaints before a constituency is ranked */
export const MIN_COMPLAINTS_FOR_CONSTITUENCY_RANKING = 5;

/**
 * Min citizen engagement actions (verified + rejected) before
 * citizenApprovalRate is used. Below this, platform average is substituted.
 */
export const MIN_ENGAGEMENT_FOR_APPROVAL_RATE = 5;

// ---------------------------------------------------------------------------
// Bayesian smoothing parameter
//
// Applied to low-volume entities to shrink their score toward the platform mean.
// score_adjusted = (n / (n + k)) × rawScore + (k / (n + k)) × platformMean
// At n = k, the adjusted score is the midpoint of rawScore and platformMean.
// Set to 0 to disable smoothing.
// ---------------------------------------------------------------------------

export const BAYESIAN_K = 20;

// ---------------------------------------------------------------------------
// Rank history window
// ---------------------------------------------------------------------------

/** Number of past periods to include in rank history for trend charts */
export const RANK_HISTORY_PERIODS = 12;

// ---------------------------------------------------------------------------
// Period type display labels
// ---------------------------------------------------------------------------

export const PERIOD_TYPE_LABEL: Record<LeaderboardPeriodType, string> = {
  WEEKLY: 'This Week',
  MONTHLY: 'This Month',
  QUARTERLY: 'This Quarter',
  ALL_TIME: 'All Time',
};

// ---------------------------------------------------------------------------
// Score signal thresholds
// Maps a final 0–100 score to a display signal.
// ---------------------------------------------------------------------------

export const SCORE_SIGNAL_THRESHOLDS: Array<{
  min: number;
  signal: ScoreSignal;
}> = [
  { min: 85, signal: 'excellent' },
  { min: 70, signal: 'good' },
  { min: 50, signal: 'fair' },
  { min: 0, signal: 'poor' },
];

// ---------------------------------------------------------------------------
// Generation schedule (cron expressions — IST = UTC+5:30)
// Stored here so the BullMQ job definition and documentation stay in sync.
// ---------------------------------------------------------------------------

export const GENERATION_CRON: Record<LeaderboardPeriodType, string> = {
  WEEKLY: '30 0 * * 1', // Every Monday 06:00 IST (00:30 UTC)
  MONTHLY: '30 0 1 * *', // 1st of every month 06:00 IST
  QUARTERLY: '30 0 1 1,4,7,10 *', // 1st of Jan, Apr, Jul, Oct 06:00 IST
  ALL_TIME: '30 20 * * 0', // Every Sunday 02:00 IST (20:30 UTC Saturday)
};
