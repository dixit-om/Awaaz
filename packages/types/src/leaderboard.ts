// ---------------------------------------------------------------------------
// Leaderboard Domain — App-level types (Phase 6)
//
// All snapshot types are decoupled from @prisma/client.
// The `metrics` field uses a typed interface (ScoreMetrics) rather than
// raw Json so that callers get autocomplete and compile-time safety.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Period types
// ---------------------------------------------------------------------------

export type LeaderboardPeriodType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ALL_TIME';

export type LeaderboardEntityType = 'AUTHORITY' | 'CONSTITUENCY';

// ---------------------------------------------------------------------------
// Score metrics breakdown
//
// Stored in the `metrics` JSON column of LeaderboardSnapshot.
// Includes both the computed component scores and the raw input values
// so anyone can verify how the final score was derived (auditability).
// ---------------------------------------------------------------------------

export type AuthorityScoreMetrics = {
  // Component scores (each 0–100 before weighting)
  verifiedResolutionRate: number;
  citizenApprovalRate: number | null;
  timeScore: number;
  assignmentEfficiency: number | null;
  openComplaintPenalty: number;
  rejectedComplaintPenalty: number;

  // Raw inputs stored for auditability
  rawMetrics: {
    assignedCount: number;
    resolvedCount: number;
    verifiedCount: number;
    rejectedCount: number;
    openCount: number;
    overdueCount: number;
    autoAssignedCount: number;
    medianResolutionTimeHours: number | null;
  };
};

export type ConstituencyScoreMetrics = {
  resolutionRate: number | null;
  verificationRate: number | null;
  citizenParticipationScore: number;
  assignmentSuccessRate: number | null;
  openIssueDensity: number;

  rawMetrics: {
    totalComplaints: number;
    resolvedCount: number;
    verifiedCount: number;
    openCount: number;
    autoAssignedCount: number;
    totalAssignedCount: number;
  };
};

export type ScoreMetrics = AuthorityScoreMetrics | ConstituencyScoreMetrics;

// ---------------------------------------------------------------------------
// Leaderboard entry — a single row as returned to the client
// ---------------------------------------------------------------------------

export type LeaderboardEntry = {
  id: string;
  entityType: LeaderboardEntityType;
  entityId: string;
  entityName: string;
  score: number;
  rank: number;
  /** Populated only when the caller has permission to see the breakdown */
  metrics: AuthorityScoreMetrics | ConstituencyScoreMetrics | null;
  scoreVersion: string;
  periodType: LeaderboardPeriodType;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
};

// ---------------------------------------------------------------------------
// Leaderboard list result — paginated
// ---------------------------------------------------------------------------

export type LeaderboardListResult = {
  items: LeaderboardEntry[];
  total: number;
  periodType: LeaderboardPeriodType;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
};

// ---------------------------------------------------------------------------
// Authority detail result
// Extended entry with rank history for trend charts
// ---------------------------------------------------------------------------

export type RankHistoryPoint = {
  periodType: LeaderboardPeriodType;
  periodStart: Date;
  score: number;
  rank: number;
};

export type AuthorityLeaderboardDetail = {
  current: LeaderboardEntry;
  /** Last 12 periods of the same periodType, ordered oldest → newest */
  rankHistory: RankHistoryPoint[];
};

export type ConstituencyLeaderboardDetail = {
  current: LeaderboardEntry;
  rankHistory: RankHistoryPoint[];
};

// ---------------------------------------------------------------------------
// Most improved result
// ---------------------------------------------------------------------------

export type MostImprovedEntry = {
  entry: LeaderboardEntry;
  previousScore: number;
  previousRank: number;
  scoreDelta: number;
  rankDelta: number;
};

// ---------------------------------------------------------------------------
// Generation result — returned by triggerGeneration
// ---------------------------------------------------------------------------

export type GenerationResult = {
  batchId: string;
  periodType: LeaderboardPeriodType;
  periodStart: Date;
  periodEnd: Date;
  authoritiesScored: number;
  constituenciesScored: number;
  durationMs: number;
};

// ---------------------------------------------------------------------------
// Input types (mirrored from validation schemas)
// ---------------------------------------------------------------------------

export type GetLeaderboardInput = {
  periodType?: LeaderboardPeriodType;
  page?: number;
  limit?: number;
};

export type GetEntityDetailsInput = {
  entityId: string;
  periodType?: LeaderboardPeriodType;
};

export type GetTopPerformersInput = {
  entityType: LeaderboardEntityType;
  periodType?: LeaderboardPeriodType;
  limit?: number;
};

export type GetMostImprovedInput = {
  entityType: LeaderboardEntityType;
  periodType?: LeaderboardPeriodType;
  limit?: number;
};

export type TriggerGenerationInput = {
  periodType: LeaderboardPeriodType;
};

// ---------------------------------------------------------------------------
// Threshold signal — for dashboard colour coding
// ---------------------------------------------------------------------------

export type ScoreSignal = 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient_data';
