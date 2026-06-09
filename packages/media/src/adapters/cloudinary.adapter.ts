/**
 * Cloudinary Cloud Provider Adapter — Phase 7
 *
 * Implements `CloudProviderAdapter` for Cloudinary v2.
 * This is the ONLY file in @awaaz/media that imports the cloudinary SDK.
 * All other modules depend on the `CloudProviderAdapter` interface from
 * @awaaz/types — never on this concrete class directly.
 *
 * Architecture:
 *   media.service.ts
 *       │  depends on interface
 *       ▼
 *   CloudProviderAdapter  (packages/types/src/media.ts)
 *       ▲  implemented by
 *       │
 *   CloudinaryAdapter  (this file)
 *       │  wraps
 *       ▼
 *   cloudinary v2 SDK
 *
 * Key design decisions:
 *   • Credentials are validated at construction time — fails fast on bad env vars.
 *   • The Cloudinary SDK instance is scoped to this class (no global config mutation).
 *   • Signature generation uses our own crypto implementation from media.utils.ts
 *     rather than the SDK helper — gives full control over the signed payload.
 *   • revokeAccess uses Cloudinary's access_control to block public delivery
 *     WITHOUT deleting the bytes (evidence preservation).
 *   • deleteAsset physically removes bytes — only called by the retention job.
 */

import { v2 as cloudinary } from 'cloudinary';
import { TRPCError } from '@trpc/server';
import type {
  CloudProviderAdapter,
  CloudProviderUploadParams,
  CloudAssetMetadata,
  GenerateUploadParamsOptions,
} from '@awaaz/types';
import {
  computeCloudinarySignature,
  generateSignatureTimestamp,
  toCloudinaryResourceType,
} from '../media.utils.js';
import { CLOUDINARY_UPLOAD_PRESET, MEDIA_ERROR } from '../media.constants.js';

// ---------------------------------------------------------------------------
// Config shape
// ---------------------------------------------------------------------------

export interface CloudinaryConfig {
  /** Cloudinary cloud name — from CLOUDINARY_CLOUD_NAME env var. */
  cloudName: string;
  /** Public API key — safe to send to clients in signed upload params. */
  apiKey: string;
  /**
   * Private API secret — NEVER sent to clients.
   * Used only for signature computation server-side.
   */
  apiSecret: string;
  /**
   * Webhook URL Cloudinary calls after eager transforms complete.
   * Optional — if not provided, eager transforms run silently.
   */
  notificationUrl?: string;
}

// ---------------------------------------------------------------------------
// Cloudinary response types (subset we actually use)
// ---------------------------------------------------------------------------

interface CloudinaryResourceResponse {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  // eager array present when eager transforms were requested
  eager?: Array<{ secure_url: string; transformation: string }>;
}

// ---------------------------------------------------------------------------
// CloudinaryAdapter
// ---------------------------------------------------------------------------

export class CloudinaryAdapter implements CloudProviderAdapter {
  readonly provider = 'CLOUDINARY' as const;

  private readonly config: CloudinaryConfig;

  constructor(config: CloudinaryConfig) {
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      throw new Error(
        'CloudinaryAdapter: cloudName, apiKey, and apiSecret are all required. ' +
          'Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars.',
      );
    }
    this.config = config;

    // Configure the SDK instance — called once at construction.
    // This sets a module-level config, so only one Cloudinary account per process.
    // For multi-tenant use, create multiple adapter instances with separate SDK config calls.
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  /**
   * Verifies API credentials by calling Cloudinary's Admin API ping endpoint.
   * Does not upload or mutate any assets.
   */
  async ping(): Promise<void> {
    try {
      const result = (await cloudinary.api.ping()) as { status?: string };
      if (result.status !== 'ok') {
        throw new Error(`Unexpected ping response: ${result.status ?? 'unknown'}`);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : ((err as { error?: { message?: string } })?.error?.message ?? 'Cloudinary API error');
      throw new Error(`Cloudinary connectivity check failed: ${message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // generateUploadParams
  //
  // Builds signed upload credentials for the client to perform a direct upload.
  // The server NEVER sees the file bytes — the client uploads directly to Cloudinary.
  //
  // Cloudinary's signed upload flow:
  //   1. Server computes: SHA-1(sorted_params_string + api_secret)
  //   2. Client POSTs { file, public_id, folder, signature, timestamp, api_key, ... }
  //      directly to https://api.cloudinary.com/v1_1/{cloud}/image|video/upload
  //   3. Cloudinary verifies signature server-side before accepting the file.
  //
  // The api_secret is NEVER returned to the client.
  // ---------------------------------------------------------------------------

  async generateUploadParams(
    publicId: string,
    options: GenerateUploadParamsOptions,
  ): Promise<CloudProviderUploadParams> {
    const timestamp = generateSignatureTimestamp();
    const resourceType = toCloudinaryResourceType(options.mediaType);

    // Build the params object that will be signed.
    // All params included here MUST be sent by the client unchanged —
    // Cloudinary rejects uploads where signed params are modified.
    //
    // Notes:
    //   • public_id already embeds the folder path — do not also sign `folder`.
    //   • max_bytes is enforced by the upload preset — exclude from signature when preset is set.
    const signableParams = {
      timestamp,
      public_id: publicId,
      allowed_formats:
        options.mediaType === 'IMAGE' ? 'jpg,jpeg,png,webp,heic,heif' : 'mp4,mov,webm,3gp',
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
      ...(options.eagerTransformations ? { eager: options.eagerTransformations } : {}),
      ...((options.notificationUrl ?? this.config.notificationUrl)
        ? { notification_url: options.notificationUrl ?? this.config.notificationUrl }
        : {}),
    };

    const signature = computeCloudinarySignature(signableParams, this.config.apiSecret);

    // Sanity check — ensures buildSignaturePayload didn't produce empty string
    if (!signature || signature.length !== 40) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: MEDIA_ERROR.PROVIDER_ERROR,
      });
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.config.cloudName}/${resourceType}/upload`;

    return {
      uploadUrl,
      apiKey: this.config.apiKey,
      signature,
      timestamp,
      publicId,
      folder: options.folder,
      cloudProvider: 'CLOUDINARY',
      extra: {
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
        // Client needs to know the resource_type to construct the correct upload URL
        resource_type: resourceType,
        // Signed params the client must include verbatim
        allowed_formats: signableParams.allowed_formats,
        ...(signableParams.eager ? { eager: signableParams.eager } : {}),
        ...(signableParams.notification_url
          ? { notification_url: signableParams.notification_url }
          : {}),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // verifyUpload
  //
  // Confirms the direct upload succeeded by fetching asset metadata from
  // Cloudinary's Admin API. Called during confirmUpload as an integrity check.
  //
  // Returns CloudAssetMetadata — the authoritative values from the provider.
  // These take precedence over client-declared metadata (width, height, etc.).
  // ---------------------------------------------------------------------------

  async verifyUpload(publicId: string, mediaType?: 'IMAGE' | 'VIDEO'): Promise<CloudAssetMetadata> {
    const resourceType = mediaType ? toCloudinaryResourceType(mediaType) : 'image';

    try {
      const result = (await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
        image_metadata: true,
        media_metadata: true,
      })) as CloudinaryResourceResponse;

      // Extract thumbnail from eager transforms if available
      // Cloudinary stores eager results in result.eager[] array
      const thumbnailEager = result.eager?.find(
        (e) => e.transformation.includes('w_400') || e.transformation.includes('so_0'),
      );

      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        thumbnailUrl: thumbnailEager?.secure_url ?? null,
        width: result.width ?? null,
        height: result.height ?? null,
        // Cloudinary returns duration in seconds for video resources
        durationSec: result.duration ? Math.round(result.duration) : null,
        sizeBytes: result.bytes,
        format: result.format,
        resourceType: resourceType,
      };
    } catch (err) {
      const error = err as { error?: { message: string }; http_code?: number };
      if (error?.http_code === 404) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `${MEDIA_ERROR.ASSET_NOT_FOUND}: publicId "${publicId}" not found on Cloudinary`,
        });
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `${MEDIA_ERROR.PROVIDER_ERROR}: ${error?.error?.message ?? 'Cloudinary API error'}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // revokeAccess
  //
  // Blocks public delivery of an asset WITHOUT deleting the bytes.
  // Used for:
  //   • Soft-deleted assets (citizen or admin deletes media)
  //   • Moderation REJECTED (asset content is not suitable for public view)
  //
  // Cloudinary's access_control mechanism sets an "anonymous" access rule
  // with an end date in the past, which causes the CDN to return 403.
  // The asset bytes remain in Cloudinary storage — they can be restored
  // by setting a new access_control rule if needed.
  //
  // Evidence preservation: bytes are NEVER deleted during the complaint
  // active lifecycle. Physical deletion only happens via the retention job.
  // ---------------------------------------------------------------------------

  async revokeAccess(publicId: string, mediaType: 'IMAGE' | 'VIDEO'): Promise<void> {
    const resourceType = toCloudinaryResourceType(mediaType);

    try {
      await cloudinary.api.update(publicId, {
        resource_type: resourceType,
        // Setting access_type "anonymous" with an end timestamp in the past
        // blocks public delivery — 403 returned by CDN for anonymous requests.
        // Authenticated Admin API calls still work (for audit/recovery).
        access_control: [
          {
            access_type: 'anonymous',
            // epoch 0 = past — immediately blocks access
            end: new Date(0).toISOString(),
          },
        ],
      });
    } catch (err) {
      const error = err as { error?: { message: string }; http_code?: number };
      // 404 on revoke is non-fatal — asset may already be gone or never existed
      if (error?.http_code === 404) return;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `${MEDIA_ERROR.PROVIDER_ERROR}: revokeAccess failed — ${error?.error?.message ?? 'Cloudinary API error'}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // deleteAsset
  //
  // PERMANENTLY deletes the asset's bytes from Cloudinary storage.
  //
  // ONLY called by the scheduled evidence retention job after the complaint
  // has been in a terminal state for longer than EVIDENCE_RETENTION_DAYS (7 years).
  // NEVER called during normal complaint lifecycle.
  //
  // `invalidate: true` ensures the CDN cache is purged (otherwise stale
  // cached versions may remain accessible for up to 30 days).
  // ---------------------------------------------------------------------------

  async deleteAsset(publicId: string, mediaType: 'IMAGE' | 'VIDEO'): Promise<void> {
    const resourceType = toCloudinaryResourceType(mediaType);

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch (err) {
      const error = err as { error?: { message: string }; http_code?: number };
      if (error?.http_code === 404) return;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `${MEDIA_ERROR.PROVIDER_ERROR}: deleteAsset failed — ${error?.error?.message ?? 'Cloudinary API error'}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // getUploadUrl (convenience helper — not part of CloudProviderAdapter interface)
  //
  // Returns the base upload endpoint URL for a given resource type.
  // Used in tests and the admin panel to display the correct endpoint.
  // ---------------------------------------------------------------------------

  getUploadUrl(mediaType: 'IMAGE' | 'VIDEO'): string {
    const resourceType = toCloudinaryResourceType(mediaType);
    return `https://api.cloudinary.com/v1_1/${this.config.cloudName}/${resourceType}/upload`;
  }
}

// ---------------------------------------------------------------------------
// Factory function — creates and validates a CloudinaryAdapter from env vars.
// Called once at server startup in apps/server/src/trpc/app.ts.
// ---------------------------------------------------------------------------

export function createCloudinaryAdapter(): CloudinaryAdapter {
  const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];
  const apiKey = process.env['CLOUDINARY_API_KEY'];
  const apiSecret = process.env['CLOUDINARY_API_SECRET'];
  const notificationUrl = process.env['CLOUDINARY_WEBHOOK_URL'];

  if (!cloudName || !apiKey || !apiSecret) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(
        'Missing Cloudinary credentials. ' +
          'Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      );
    }
    // In development, return a stub that surfaces a clear error only when
    // media-upload endpoints are actually called — the server still starts.
    console.warn('⚠️  Cloudinary credentials not set. Media upload endpoints will be unavailable.');
    return new CloudinaryAdapter({
      cloudName: 'dev-placeholder',
      apiKey: 'dev-placeholder',
      apiSecret: 'dev-placeholder-secret-32chars-padding',
      notificationUrl: undefined,
    });
  }

  // Safe startup confirmation — log cloud name + preset only, never secrets.
  console.log(
    `✓ Cloudinary Config Loaded (cloud: ${cloudName}, preset: ${CLOUDINARY_UPLOAD_PRESET})`,
  );

  return new CloudinaryAdapter({
    cloudName,
    apiKey,
    apiSecret,
    notificationUrl,
  });
}

/**
 * Standalone connectivity check — validates credentials against Cloudinary's Admin API.
 * Safe to run from a script; logs cloud name only, never secrets.
 */
export async function verifyCloudinaryConnectivity(): Promise<void> {
  const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];
  const apiKey = process.env['CLOUDINARY_API_KEY'];
  const apiSecret = process.env['CLOUDINARY_API_SECRET'];

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Missing Cloudinary credentials. ' +
        'Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
    );
  }

  const adapter = new CloudinaryAdapter({ cloudName, apiKey, apiSecret });
  await adapter.ping();
  console.log(`✓ Cloudinary connectivity OK (cloud: ${cloudName})`);
}

// ---------------------------------------------------------------------------
// Verify the Cloudinary signature algorithm with a known test vector.
// Run once at startup to catch env / crypto misconfigurations early.
// ---------------------------------------------------------------------------

export function verifyCloudinaySignatureAlgorithm(apiSecret: string): boolean {
  // Cloudinary's own test vector from their documentation:
  //   params: { public_id: "sample", timestamp: 1315060510 }
  //   secret: "abcd"
  //   expected: "c3470533147774275dd37996cc4d0e68fd03cd4f"
  const params = { public_id: 'sample', timestamp: 1315060510 };
  const testSecret = 'abcd';
  const expected = 'c3470533147774275dd37996cc4d0e68fd03cd4f';
  const actual = computeCloudinarySignature(params, testSecret);
  if (actual !== expected) {
    throw new Error(
      `Cloudinary signature algorithm mismatch. Expected "${expected}" but got "${actual}". ` +
        'This is a bug in computeCloudinarySignature — do not deploy.',
    );
  }
  // Suppress unused variable warning for apiSecret (used to signal intent to callers)
  void apiSecret;
  return true;
}

// Verify at module load time in non-test environments.
// A wrong signature would silently cause all client uploads to fail.
if (process.env['NODE_ENV'] !== 'test') {
  verifyCloudinaySignatureAlgorithm('');
}

/**
 * Re-export the config interface so callers can type-annotate without
 * importing from the adapter directly.
 */
export type { CloudinaryConfig as CloudinaryAdapterConfig };
