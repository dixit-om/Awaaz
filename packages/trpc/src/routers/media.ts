import type { MediaService } from '@awaaz/media';
import {
  createUploadRequestSchema,
  confirmUploadSchema,
  getMediaByComplaintSchema,
  deleteMediaSchema,
} from '@awaaz/validation';
import { protectedProcedure, router } from '../server';

export function createMediaRouter(mediaService: MediaService) {
  return router({
    /**
     * Step 1 of the direct-upload flow.
     *
     * Validates the intended upload (MIME type, file size, complaint ownership,
     * complaint status, per-complaint media limits, optional duplicate detection)
     * and returns signed cloud upload credentials.
     *
     * The client uploads the file DIRECTLY to the cloud provider using these
     * credentials — the server is never in the file data path.
     *
     * Authorization: CITIZEN only (MLAs and admins cannot upload evidence).
     *
     * Returns: { mediaAssetId, uploadUrl, apiKey, signature, timestamp,
     *            publicId, folder, cloudProvider }
     */
    createUploadRequest: protectedProcedure
      .input(createUploadRequestSchema)
      .mutation(({ ctx, input }) => {
        return mediaService.createUploadRequest(ctx.user, input);
      }),

    /**
     * Step 2 of the direct-upload flow.
     *
     * Called by the client AFTER the file has been successfully uploaded to the
     * cloud provider. Performs:
     *   • publicId integrity check (server-issued value must match)
     *   • SHA-256 hash storage (immutable evidence integrity field)
     *   • capturedAt plausibility validation
     *   • Atomic DB transition: UPLOADING → READY, pendingUploadToken cleared
     *   • MEDIA_UPLOADED domain event published
     *
     * Authorization: the citizen who created the upload (or ADMIN).
     *
     * Returns: { asset: MediaAssetDTO }
     */
    confirmUpload: protectedProcedure.input(confirmUploadSchema).mutation(({ ctx, input }) => {
      return mediaService.confirmUpload(ctx.user, input);
    }),

    /**
     * Fetch all media assets attached to a complaint.
     *
     * Role-based visibility applied by the service layer:
     *   CITIZEN (owner)  → full DTOs for all own assets (all statuses)
     *   MLA              → public DTOs for APPROVED assets only
     *   ADMIN            → full DTOs including soft-deleted assets
     *
     * Non-owners never see UPLOADING, FAILED, DELETED, or moderation-REJECTED
     * assets — this is enforced at the service layer, not here.
     *
     * Authorization: all authenticated users (service enforces per-role access).
     *
     * Returns: { assets: MediaAssetDTO[] | MediaAssetPublicDTO[], total: number }
     */
    getMediaByComplaint: protectedProcedure
      .input(getMediaByComplaintSchema)
      .query(({ ctx, input }) => {
        return mediaService.getMediaByComplaint(ctx.user, input);
      }),

    /**
     * Soft-delete a media asset.
     *
     * Evidence preservation guarantees:
     *   • The DB row is NEVER physically deleted (deletedAt + deletedById set).
     *   • Cloud access is revoked (CDN returns 403) but bytes are retained.
     *   • Physical deletion only occurs via the 7-year retention job.
     *   • MEDIA_DELETED event is published for the audit trail.
     *
     * Authorization:
     *   CITIZEN → own uploads in UPLOADING or READY state, non-terminal complaint only.
     *   ADMIN   → any asset in any state.
     *
     * Returns: { success: true, assetId: string }
     */
    deleteMedia: protectedProcedure.input(deleteMediaSchema).mutation(({ ctx, input }) => {
      return mediaService.deleteMedia(ctx.user, input);
    }),
  });
}
