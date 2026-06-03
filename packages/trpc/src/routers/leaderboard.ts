import type { LeaderboardService } from '@awaaz/leaderboard';
import {
  getLeaderboardSchema,
  getEntityDetailsSchema,
  getTopPerformersSchema,
  getMostImprovedSchema,
  triggerGenerationSchema,
} from '@awaaz/validation';
import { protectedProcedure, publicProcedure, router } from '../server';

export function createLeaderboardRouter(leaderboardService: LeaderboardService) {
  return router({
    /**
     * Paginated authority leaderboard — ranked by weighted governance score.
     * Public: citizens, MLAs, admins, and future unauthenticated portal users.
     * Metrics breakdown is NOT included in list view (use getAuthorityDetails).
     */
    getAuthorities: publicProcedure.input(getLeaderboardSchema).query(({ input }) => {
      return leaderboardService.getAuthorities(input);
    }),

    /**
     * Paginated constituency leaderboard — ranked by resolution + citizen
     * participation metrics.
     * Public: same as getAuthorities.
     */
    getConstituencies: publicProcedure.input(getLeaderboardSchema).query(({ input }) => {
      return leaderboardService.getConstituencies(input);
    }),

    /**
     * Full detail for a single authority:
     *   - Current rank + score
     *   - Score component breakdown (metrics)
     *     → MLA sees breakdown for themselves only
     *     → Admin sees breakdown for any authority
     *     → Others see null metrics (rank + score only)
     *   - Rank history for the last 12 periods (trend chart)
     *
     * Protected: requires authentication to determine metrics visibility.
     */
    getAuthorityDetails: protectedProcedure
      .input(getEntityDetailsSchema)
      .query(({ ctx, input }) => {
        return leaderboardService.getAuthorityDetails(ctx.user, input);
      }),

    /**
     * Full detail for a single constituency:
     *   - Current rank + score
     *   - Constituency score components (all public — no personal data)
     *   - Rank history for the last 12 periods
     *
     * Public: constituency metrics contain no personally identifiable info.
     */
    getConstituencyDetails: publicProcedure.input(getEntityDetailsSchema).query(({ input }) => {
      return leaderboardService.getConstituencyDetails(input);
    }),

    /**
     * Top N performers for a period — used by homepage widget and
     * public transparency dashboard.
     * Public: no auth required.
     */
    getTopPerformers: publicProcedure.input(getTopPerformersSchema).query(({ input }) => {
      return leaderboardService.getTopPerformers(input);
    }),

    /**
     * Most improved entities vs the previous period.
     * Shows score delta + rank delta — rewards genuine improvement.
     * Public: no auth required.
     */
    getMostImproved: publicProcedure.input(getMostImprovedSchema).query(({ input }) => {
      return leaderboardService.getMostImproved(input);
    }),

    /**
     * Manually triggers leaderboard generation for a given period.
     * Admin only — rate-limited in production by the BullMQ job scheduler.
     * Returns a GenerationResult with counts and duration.
     */
    triggerGeneration: protectedProcedure
      .input(triggerGenerationSchema)
      .mutation(({ ctx, input }) => {
        return leaderboardService.triggerGeneration(ctx.user, input);
      }),
  });
}
