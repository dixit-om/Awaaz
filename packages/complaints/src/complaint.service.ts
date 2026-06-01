import { TRPCError } from '@trpc/server';
import type { AuthUser } from '@awaaz/types';
import type {
  ComplaintCategoryItem,
  ComplaintCreateResult,
  ComplaintDetail,
  ComplaintStatus,
  ComplaintStatusUpdateResult,
  ComplaintSummary,
  CreateComplaintInput,
  ListComplaintsInput,
  PaginatedResponse,
  UpdateComplaintStatusInput,
} from '@awaaz/types';
import { canTransition, isTerminalStatus, transitionErrorMessage } from './complaint.constants.js';
import type { ComplaintRepository } from './complaint.repository.js';

export class ComplaintService {
  constructor(private readonly repo: ComplaintRepository) {}

  // ---------------------------------------------------------------------------
  // createComplaint
  // ---------------------------------------------------------------------------

  async createComplaint(
    actor: AuthUser,
    input: CreateComplaintInput,
  ): Promise<ComplaintCreateResult> {
    if (actor.role !== 'citizen') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only citizens can report complaints',
      });
    }

    const category = await this.repo.findCategoryById(input.categoryId);
    if (!category) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Category not found',
      });
    }
    if (!category.isActive) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This category is currently inactive',
      });
    }

    return this.repo.create(input, actor.id);
  }

  // ---------------------------------------------------------------------------
  // getComplaintById
  // ---------------------------------------------------------------------------

  async getComplaintById(actor: AuthUser, id: string): Promise<ComplaintDetail> {
    const complaint = await this.repo.findById(id);

    if (!complaint) {
      // Return 404 regardless of whether it exists but is private — avoid leaking
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Complaint not found' });
    }

    this.assertCanView(actor, complaint);

    return complaint;
  }

  // ---------------------------------------------------------------------------
  // listComplaints
  // ---------------------------------------------------------------------------

  async listComplaints(
    actor: AuthUser,
    input: ListComplaintsInput,
  ): Promise<PaginatedResponse<ComplaintSummary>> {
    const scope =
      actor.role === 'admin'
        ? ('admin' as const)
        : actor.role === 'mla'
          ? ('authority' as const)
          : ('citizen' as const);

    const { items, total } = await this.repo.list(scope, actor.id, input);
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // updateComplaintStatus
  // ---------------------------------------------------------------------------

  async updateComplaintStatus(
    actor: AuthUser,
    input: UpdateComplaintStatusInput,
  ): Promise<ComplaintStatusUpdateResult> {
    const raw = await this.repo.findByIdRaw(input.id);

    if (!raw) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Complaint not found' });
    }

    const currentStatus = raw.status as ComplaintStatus;
    const newStatus = input.newStatus;

    // 1. Terminal guard
    if (isTerminalStatus(currentStatus)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: transitionErrorMessage(currentStatus, newStatus, actor.role),
      });
    }

    // 2. Duplicate status guard
    if (currentStatus === newStatus) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Complaint is already in status ${currentStatus}`,
      });
    }

    // 3. Role-level transition permission
    if (!canTransition(actor.role, currentStatus, newStatus)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: transitionErrorMessage(currentStatus, newStatus, actor.role),
      });
    }

    // 4. Ownership checks
    if (actor.role === 'citizen') {
      // Citizens may only act on their own complaints
      if (raw.citizenId !== actor.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Complaint not found' });
      }
    }

    if (actor.role === 'mla') {
      // MLA may only update complaints assigned to them (except self-assign from SUBMITTED)
      const isAssigning = newStatus === 'ASSIGNED';
      const isSelfAssign = isAssigning && input.assigneeId === actor.id;

      if (!isAssigning && raw.assignedAuthorityId !== actor.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update complaints assigned to you',
        });
      }

      if (isSelfAssign) {
        // allowed — MLA taking ownership
      }
    }

    // 5. Assignee validation (SUBMITTED → ASSIGNED)
    let resolvedAssigneeId: string | undefined;
    if (newStatus === 'ASSIGNED') {
      if (!input.assigneeId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'assigneeId is required when assigning a complaint',
        });
      }
      resolvedAssigneeId = input.assigneeId;
    }

    // 6. Write — atomic in repository
    return this.repo.updateStatus(input.id, newStatus, actor.id, {
      remarks: input.remarks,
      assignedAuthorityId: resolvedAssigneeId,
    });
  }

  // ---------------------------------------------------------------------------
  // deleteComplaint (admin only — soft delete)
  // ---------------------------------------------------------------------------

  async deleteComplaint(actor: AuthUser, id: string): Promise<{ success: true }> {
    if (actor.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can delete complaints' });
    }

    const raw = await this.repo.findByIdRaw(id);
    if (!raw) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Complaint not found' });
    }

    await this.repo.softDelete(id);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // listCategories (public — no auth required, actor not needed)
  // ---------------------------------------------------------------------------

  async listCategories(): Promise<ComplaintCategoryItem[]> {
    return this.repo.listActiveCategories();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertCanView(actor: AuthUser, complaint: ComplaintDetail): void {
    if (actor.role === 'admin') return;

    if (actor.role === 'citizen') {
      if (complaint.citizen.id !== actor.id) {
        // Return 404 to avoid leaking existence of private complaints
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Complaint not found' });
      }
      return;
    }

    if (actor.role === 'mla') {
      if (complaint.assignedAuthority?.id !== actor.id && complaint.citizen.id !== actor.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Complaint not found' });
      }
      return;
    }
  }
}
