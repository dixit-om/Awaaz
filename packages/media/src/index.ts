/**
 * @awaaz/media — Phase 7: Media Upload & Evidence Management
 *
 * Barrel export. Re-exports are added here as each module is implemented:
 *   Step 4  — media.constants.ts
 *   Step 5  — media.utils.ts
 *   Step 6  — adapters/cloudinary.adapter.ts
 *   Step 7  — media.repository.ts
 *   Step 8  — media.service.ts  (MediaService, createMediaService)
 */
export * from './media.constants';
export * from './media.utils';
export {
  CloudinaryAdapter,
  createCloudinaryAdapter,
  verifyCloudinaryConnectivity,
  verifyCloudinaySignatureAlgorithm,
  type CloudinaryAdapterConfig,
} from './adapters/cloudinary.adapter';
export {
  MediaRepository,
  type CreateAssetData,
  type ConfirmAssetData,
  type ModerateAssetData,
} from './media.repository';
export { MediaService, createMediaService } from './media.service';
