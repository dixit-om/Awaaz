import type { GeoService } from '@awaaz/geo';
import {
  assignComplaintToAuthoritySchema,
  findConstituencyByLocationSchema,
  getConstituencySchema,
  listAuthorityAssignmentsSchema,
  listConstituenciesSchema,
} from '@awaaz/validation';
import { protectedProcedure, router } from '../server';

export function createGeoRouter(geoService: GeoService) {
  return router({
    /**
     * Point-in-polygon preview — returns matched constituency + active authority.
     * Used by the complaint form to show citizens where their report will go
     * before they submit.
     */
    findConstituencyByLocation: protectedProcedure
      .input(findConstituencyByLocationSchema)
      .query(({ ctx, input }) => {
        return geoService.findConstituencyByLocation(ctx.user, input);
      }),

    /**
     * Full constituency detail — name, code, type, GeoJSON boundary,
     * and the currently active MLA/authority assignment.
     */
    getConstituency: protectedProcedure.input(getConstituencySchema).query(({ ctx, input }) => {
      return geoService.getConstituency(ctx.user, input.id);
    }),

    /**
     * Paginated list of constituencies.
     * Filterable by type (WARD / ASSEMBLY / PARLIAMENTARY) and isActive.
     */
    listConstituencies: protectedProcedure
      .input(listConstituenciesSchema)
      .query(({ ctx, input }) => {
        return geoService.listConstituencies(ctx.user, input);
      }),

    /**
     * Manual assignment override — admin only.
     * Bypasses auto-assignment; sets assignmentSource = MANUAL.
     * Used for unmatched complaints and edge-case corrections.
     */
    assignComplaintToAuthority: protectedProcedure
      .input(assignComplaintToAuthoritySchema)
      .mutation(({ ctx, input }) => {
        return geoService.assignComplaintToAuthority(ctx.user, input);
      }),

    /**
     * Full authority assignment history — admin only.
     * Filterable by constituency, authority, and isActive.
     * Powers the admin transparency and accountability dashboards.
     */
    listAuthorityAssignments: protectedProcedure
      .input(listAuthorityAssignmentsSchema)
      .query(({ ctx, input }) => {
        return geoService.listAuthorityAssignments(ctx.user, input);
      }),
  });
}
