import type { ComplaintService } from '@awaaz/complaints';
import {
  complaintIdSchema,
  createComplaintSchema,
  listComplaintsSchema,
  updateComplaintStatusSchema,
} from '@awaaz/validation';
import { publicProcedure, protectedProcedure, router } from '../server';

export function createComplaintsRouter(complaintService: ComplaintService) {
  return router({
    /**
     * Active categories — no auth required.
     * Used to populate complaint-creation forms.
     */
    listCategories: publicProcedure.query(() => {
      return complaintService.listCategories();
    }),

    /**
     * Submit a new civic complaint.
     * Citizens only — enforced in service layer.
     */
    createComplaint: protectedProcedure.input(createComplaintSchema).mutation(({ ctx, input }) => {
      return complaintService.createComplaint(ctx.user, input);
    }),

    /**
     * Fetch a single complaint with full detail, media, and status history.
     * Role-scoped visibility enforced in service layer.
     */
    getComplaintById: protectedProcedure.input(complaintIdSchema).query(({ ctx, input }) => {
      return complaintService.getComplaintById(ctx.user, input.id);
    }),

    /**
     * List complaints — scope applied automatically per role:
     *   citizen   → own complaints
     *   mla       → assigned complaints
     *   admin     → all complaints
     */
    listComplaints: protectedProcedure.input(listComplaintsSchema).query(({ ctx, input }) => {
      return complaintService.listComplaints(ctx.user, input);
    }),

    /**
     * Advance the complaint through the lifecycle.
     * Transition rules, role checks, and ownership are enforced in the service.
     */
    updateComplaintStatus: protectedProcedure
      .input(updateComplaintStatusSchema)
      .mutation(({ ctx, input }) => {
        return complaintService.updateComplaintStatus(ctx.user, input);
      }),

    /**
     * Soft-delete a complaint.
     * Admin only — enforced in service layer.
     */
    deleteComplaint: protectedProcedure.input(complaintIdSchema).mutation(({ ctx, input }) => {
      return complaintService.deleteComplaint(ctx.user, input.id);
    }),
  });
}
