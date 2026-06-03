// ---------------------------------------------------------------------------
// Leaderboard utility functions — pure, no DB or tRPC dependencies
// Zero side effects. All functions are deterministic given the same inputs.
// ---------------------------------------------------------------------------

import type {
  AuthorityScoreMetrics,
  ConstituencyScoreMetrics,
  LeaderboardEntry,
  LeaderboardPeriodType,
  MostImprovedEntry,
  ScoreSignal,
} from '@awaaz/types';
import {
  AUTHORITY_WEIGHTS,
  CONSTITUENCY_WEIGHTS,
  BAYESIAN_K,
  MIN_ENGAGEMENT_FOR_APPROVAL_RATE,
  RESOLUTION_TIME_TARGET_HOURS,
  SCORE_SIGNAL_THRESHOLDS,
} from './leaderboard.constants.js';

// ---------------------------------------------------------------------------
// Precision helper — same as analytics.utils but self-contained here to
// avoid a circular dep between @awaaz/leaderboard and @awaaz/analytics.
// ---------------------------------------------------------------------------

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeDivide(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

// ---------------------------------------------------------------------------
// 1. Authority score computation
// ---------------------------------------------------------------------------

/**
 * Computes the weighted authority score (0–100) from pre-fetched metrics.
 *
 * Each component is first normalised to a 0–100 scale, then multiplied by
 * its weight. Penalties are deducted from the total.
 *
 * @param metrics  - Raw analytics values from AnalyticsRepository
 * @param platformMeanScore - Platform-average score used for Bayesian smoothing
 *                            and as fallback for citizenApprovalRate when volume
 *                            is below MIN_ENGAGEMENT_FOR_APPROVAL_RATE
 */
export function computeAuthorityScore(
  metrics: AuthorityScoreMetrics['rawMetrics'],
  platformMeanScore = 50,
): { score: number; components: AuthorityScoreMetrics } {
  const {
    assignedCount,
    verifiedCount,
    rejectedCount,
    overdueCount,
    autoAssignedCount,
    medianResolutionTimeHours,
  } = metrics;

  // --- Component 1: Verified Resolution Rate (40%) ---
  const verifiedResolutionRate = round((safeDivide(verifiedCount, assignedCount) ?? 0) * 100, 2);

  // --- Component 2: Citizen Approval Rate (20%) ---
  // Use platform mean when engagement volume is too low to be meaningful.
  const engagementTotal = verifiedCount + rejectedCount;
  const citizenApprovalRate =
    engagementTotal >= MIN_ENGAGEMENT_FOR_APPROVAL_RATE
      ? round((safeDivide(verifiedCount, engagementTotal) ?? 0) * 100, 2)
      : null; // null → platform average substituted in weighted sum

  const effectiveApprovalRate = citizenApprovalRate ?? platformMeanScore;

  // --- Component 3: Time Score (20%) ---
  // Score = 100 when medianHours = 0, decays to 0 at TARGET_HOURS, clamped.
  // null (no resolved complaints yet) → 0 score for this component.
  const timeScore =
    medianResolutionTimeHours == null
      ? 0
      : round(
          clamp((1 - medianResolutionTimeHours / RESOLUTION_TIME_TARGET_HOURS) * 100, 0, 100),
          2,
        );

  // --- Component 4: Assignment Efficiency (5%) ---
  // Bonus only — auto-assignment rate. Never a penalty.
  const totalAssignedExcludingUnmatched = assignedCount; // already filtered in repo
  const assignmentEfficiency =
    totalAssignedExcludingUnmatched > 0
      ? round((autoAssignedCount / totalAssignedExcludingUnmatched) * 100, 2)
      : null;
  const effectiveAssignmentEff = assignmentEfficiency ?? 0;

  // --- Component 5: Open Complaint Penalty (10%) ---
  // Proportion of overdue open complaints. Higher overdue rate = larger penalty.
  const openComplaintPenalty = round(
    clamp((safeDivide(overdueCount, assignedCount) ?? 0) * 100, 0, 100),
    2,
  );

  // --- Component 6: Rejected Complaint Penalty (5%) ---
  const rejectedComplaintPenalty = round(
    clamp((safeDivide(rejectedCount, assignedCount) ?? 0) * 100, 0, 100),
    2,
  );

  // --- Weighted sum ---
  const rawScore =
    verifiedResolutionRate * AUTHORITY_WEIGHTS.verifiedResolutionRate +
    effectiveApprovalRate * AUTHORITY_WEIGHTS.citizenApprovalRate +
    timeScore * AUTHORITY_WEIGHTS.resolutionTime +
    effectiveAssignmentEff * AUTHORITY_WEIGHTS.assignmentEfficiency -
    openComplaintPenalty * AUTHORITY_WEIGHTS.openComplaintPenalty -
    rejectedComplaintPenalty * AUTHORITY_WEIGHTS.rejectedComplaintPenalty;

  const score = round(clamp(rawScore, 0, 100), 2);

  const components: AuthorityScoreMetrics = {
    verifiedResolutionRate,
    citizenApprovalRate,
    timeScore,
    assignmentEfficiency,
    openComplaintPenalty,
    rejectedComplaintPenalty,
    rawMetrics: {
      ...metrics,
      resolvedCount: metrics.resolvedCount,
    },
  };

  return { score, components };
}

// ---------------------------------------------------------------------------
// 2. Constituency score computation
// ---------------------------------------------------------------------------

export function computeConstituencyScore(
  metrics: ConstituencyScoreMetrics['rawMetrics'],
  platformParticipationMedian = 50,
): { score: number; components: ConstituencyScoreMetrics } {
  const {
    totalComplaints,
    resolvedCount,
    verifiedCount,
    openCount,
    autoAssignedCount,
    totalAssignedCount,
  } = metrics;

  // --- Resolution Rate (35%) ---
  const resolutionRate =
    totalComplaints > 0
      ? round(((resolvedCount + verifiedCount) / totalComplaints) * 100, 2)
      : null;

  // --- Verification Rate (30%) ---
  const resolvedPlusVerified = resolvedCount + verifiedCount;
  const verificationRate =
    resolvedPlusVerified > 0 ? round((verifiedCount / resolvedPlusVerified) * 100, 2) : null;

  // --- Citizen Participation Score (15%) ---
  // Relative score: how this constituency's complaint volume compares to
  // the platform median. Scaled to 0–100 using the median as the 50pt anchor.
  // Above median = > 50, below = < 50. Clamped to 0–100.
  // This rewards constituencies where citizens are actively engaged.
  const citizenParticipationScore =
    platformParticipationMedian > 0
      ? round(clamp((totalComplaints / platformParticipationMedian) * 50, 0, 100), 2)
      : 0;

  // --- Assignment Success Rate (10%) ---
  const assignmentSuccessRate =
    totalAssignedCount > 0 ? round((autoAssignedCount / totalAssignedCount) * 100, 2) : null;

  // --- Open Issue Density Penalty (10%) ---
  const openIssueDensity = round(
    clamp(totalComplaints > 0 ? (openCount / totalComplaints) * 100 : 0, 0, 100),
    2,
  );

  // --- Weighted sum ---
  const rawScore =
    (resolutionRate ?? 0) * CONSTITUENCY_WEIGHTS.resolutionRate +
    (verificationRate ?? 0) * CONSTITUENCY_WEIGHTS.verificationRate +
    citizenParticipationScore * CONSTITUENCY_WEIGHTS.citizenParticipation +
    (assignmentSuccessRate ?? 0) * CONSTITUENCY_WEIGHTS.assignmentSuccessRate -
    openIssueDensity * CONSTITUENCY_WEIGHTS.openIssueDensity;

  const score = round(clamp(rawScore, 0, 100), 2);

  const components: ConstituencyScoreMetrics = {
    resolutionRate,
    verificationRate,
    citizenParticipationScore,
    assignmentSuccessRate,
    openIssueDensity,
    rawMetrics: metrics,
  };

  return { score, components };
}

// ---------------------------------------------------------------------------
// 3. Bayesian score smoothing
//
// Shrinks scores from low-volume entities toward the platform mean.
// Prevents a single 2-complaint authority from scoring 100.
//
// Formula: adjustedScore = (n / (n + k)) × rawScore + (k / (n + k)) × mean
// At n >> k: score ≈ rawScore (full trust)
// At n << k: score ≈ mean   (strong prior)
// ---------------------------------------------------------------------------

export function applyBayesianSmoothing(
  rawScore: number,
  sampleSize: number,
  platformMean: number,
  k: number = BAYESIAN_K,
): number {
  if (k === 0 || sampleSize >= k * 5) return rawScore; // skip if disabled or large sample
  const weight = sampleSize / (sampleSize + k);
  return round(weight * rawScore + (1 - weight) * platformMean, 2);
}

// ---------------------------------------------------------------------------
// 4. Dense rank assignment
//
// Assigns 1-based dense ranks to an array of scored entries.
// Entries must be sorted descending by score before calling this function.
// Ties share the same rank; the next distinct score continues from there.
//
// Example: scores [92, 88, 88, 75] → ranks [1, 2, 2, 3]
// ---------------------------------------------------------------------------

export function assignDenseRanks<T extends { score: number }>(
  entries: T[],
): Array<T & { rank: number }> {
  let currentRank = 1;
  let lastScore: number | null = null;

  return entries.map((entry, index) => {
    if (lastScore === null) {
      lastScore = entry.score;
      return { ...entry, rank: 1 };
    }
    if (entry.score === lastScore) {
      return { ...entry, rank: currentRank };
    }
    currentRank = index + 1;
    lastScore = entry.score;
    return { ...entry, rank: currentRank };
  });
}

// ---------------------------------------------------------------------------
// 5. Most improved calculation
//
// Computes score and rank deltas between two periods for the same entity.
// Only entities with valid data in both periods are included.
// ---------------------------------------------------------------------------

export function computeMostImproved(
  current: LeaderboardEntry[],
  previous: Map<string, LeaderboardEntry>,
  limit: number,
): MostImprovedEntry[] {
  const improvements: MostImprovedEntry[] = [];

  for (const entry of current) {
    const prev = previous.get(entry.entityId);
    if (!prev) continue; // entity had no data in previous period

    const scoreDelta = round(entry.score - prev.score, 2);
    const rankDelta = prev.rank - entry.rank; // positive = moved up

    improvements.push({
      entry,
      previousScore: prev.score,
      previousRank: prev.rank,
      scoreDelta,
      rankDelta,
    });
  }

  // Sort by score improvement descending, break ties by rank improvement
  improvements.sort((a, b) => {
    if (b.scoreDelta !== a.scoreDelta) return b.scoreDelta - a.scoreDelta;
    return b.rankDelta - a.rankDelta;
  });

  return improvements.slice(0, limit);
}

// ---------------------------------------------------------------------------
// 6. Score signal
//
// Maps a final 0–100 score to a display signal level.
// Returns 'insufficient_data' for null scores.
// ---------------------------------------------------------------------------

export function getScoreSignal(score: number | null): ScoreSignal {
  if (score === null) return 'insufficient_data';
  for (const { min, signal } of SCORE_SIGNAL_THRESHOLDS) {
    if (score >= min) return signal;
  }
  return 'poor';
}

// ---------------------------------------------------------------------------
// 7. Period date window helpers
//
// Returns the inclusive start/end Date for a given period type relative to
// a reference date (defaults to now). Used by the generation service to
// know which complaints to aggregate.
// ---------------------------------------------------------------------------

export function getPeriodWindow(
  periodType: LeaderboardPeriodType,
  referenceDate: Date = new Date(),
): { periodStart: Date; periodEnd: Date } {
  const end = new Date(referenceDate);
  end.setMilliseconds(999);
  end.setSeconds(59);
  end.setMinutes(59);
  end.setHours(23);

  const start = new Date(end);

  switch (periodType) {
    case 'WEEKLY': {
      // Start of the current ISO week (Monday)
      const day = start.getDay(); // 0 = Sunday
      const diff = (day === 0 ? -6 : 1) - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'MONTHLY': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'QUARTERLY': {
      const month = start.getMonth(); // 0-based
      const quarterStartMonth = Math.floor(month / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'ALL_TIME': {
      // Fixed epoch — the platform launch date
      start.setFullYear(2025, 0, 1); // 1 Jan 2025
      start.setHours(0, 0, 0, 0);
      break;
    }
  }

  return { periodStart: start, periodEnd: end };
}

/**
 * Returns a stable string key for a (periodType, periodStart) pair.
 * Used as cache keys and for identifying "same period" across snapshots.
 */
export function periodKey(periodType: LeaderboardPeriodType, periodStart: Date): string {
  return `${periodType}:${periodStart.toISOString().slice(0, 10)}`;
}
