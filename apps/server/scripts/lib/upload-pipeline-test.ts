/**
 * Step 4 — Temporary upload pipeline validation.
 *
 * Exercises: Local file → MediaService → CloudinaryAdapter → Cloudinary → metadata.
 * Uses a disposable [PIPELINE_TEST] complaint — not wired to the report UI.
 */
import { createHash } from 'node:crypto';
import { prisma } from '@awaaz/db';
import type { AuthUser } from '@awaaz/types';
import { prismaRoleToAppRole } from '@awaaz/types';
import { createCloudinaryAdapter, createMediaService, MediaRepository } from '@awaaz/media';

/** Minimal 1×1 PNG — no external file dependency. */
const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const PIPELINE_TEST_PHONE = '+919876543212';
const PIPELINE_TEST_TITLE = '[PIPELINE_TEST] Temporary upload validation';

export type UploadPipelineTestResult = {
  complaintId: string;
  mediaAssetId: string;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  bytes: number;
  format: string;
  mediaLibraryFolder: string;
};

function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function toAuthUser(user: {
  id: string;
  name: string | null;
  phoneNumber: string;
  role: 'CITIZEN' | 'MLA' | 'ADMIN';
  isVerified: boolean;
  reputationScore: number;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    phoneNumber: user.phoneNumber,
    role: prismaRoleToAppRole(user.role),
    isVerified: user.isVerified,
    reputationScore: user.reputationScore,
  };
}

interface CloudinaryDirectUploadResponse {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  resource_type?: string;
}

async function postFileToCloudinary(
  fileBytes: Buffer,
  fileName: string,
  mimeType: string,
  creds: {
    uploadUrl: string;
    apiKey: string;
    signature: string;
    timestamp: number;
    publicId: string;
    folder: string;
    uploadPreset: string;
    allowedFormats: string;
  },
): Promise<CloudinaryDirectUploadResponse> {
  const form = new FormData();
  form.append('file', new Blob([fileBytes], { type: mimeType }), fileName);
  form.append('api_key', creds.apiKey);
  form.append('timestamp', String(creds.timestamp));
  form.append('signature', creds.signature);
  form.append('public_id', creds.publicId);
  form.append('upload_preset', creds.uploadPreset);
  form.append('allowed_formats', creds.allowedFormats);

  const res = await fetch(creds.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudinary direct upload failed: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<CloudinaryDirectUploadResponse>;
}

async function createPipelineTestComplaint(citizenId: string, categoryId: string): Promise<string> {
  const complaint = await prisma.complaint.create({
    data: {
      title: PIPELINE_TEST_TITLE,
      description: 'Disposable complaint for Cloudinary upload pipeline validation only.',
      categoryId,
      citizenId,
      status: 'SUBMITTED',
      latitude: 28.6139,
      longitude: 77.209,
      address: 'Pipeline test — not a real complaint',
    },
    select: { id: true },
  });
  return complaint.id;
}

/**
 * Runs the full upload pipeline using MediaService + CloudinaryAdapter.
 * Creates ephemeral DB fixtures tagged [PIPELINE_TEST]; does not touch the report UI.
 */
export async function runUploadPipelineTest(): Promise<UploadPipelineTestResult> {
  const cloudinaryAdapter = createCloudinaryAdapter();
  const mediaRepo = new MediaRepository(prisma);
  const mediaService = createMediaService(mediaRepo, cloudinaryAdapter, null);

  const citizen = await prisma.user.findUnique({
    where: { phoneNumber: PIPELINE_TEST_PHONE },
  });
  if (!citizen) {
    throw new Error(`Seeded citizen not found (${PIPELINE_TEST_PHONE}). Run: pnpm db:seed`);
  }

  const category = await prisma.complaintCategory.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  if (!category) {
    throw new Error('No complaint category found. Run: pnpm db:seed');
  }

  const complaintId = await createPipelineTestComplaint(citizen.id, category.id);
  const authUser = toAuthUser(citizen);

  const fileName = 'pipeline-test-1x1.png';
  const mimeType = 'image/png';
  const sha256Hash = sha256Hex(SAMPLE_PNG);

  try {
    // 1. MediaService — issue signed upload credentials
    const creds = await mediaService.createUploadRequest(authUser, {
      complaintId,
      mediaType: 'IMAGE',
      fileName,
      mimeType,
      sizeBytes: SAMPLE_PNG.length,
      sha256HashEarly: sha256Hash,
    });

    // 2. Client-side direct upload (simulated) → Cloudinary storage
    const cloudRes = await postFileToCloudinary(SAMPLE_PNG, fileName, mimeType, creds);

    // 3. MediaService — confirm upload and persist metadata
    await mediaService.confirmUpload(authUser, {
      mediaAssetId: creds.mediaAssetId,
      publicId: creds.publicId,
      secureUrl: cloudRes.secure_url,
      sha256Hash,
      metadata: {
        width: cloudRes.width,
        height: cloudRes.height,
        sizeBytes: cloudRes.bytes,
      },
    });

    // 4. CloudinaryAdapter — verify asset exists in Media Library (Admin API)
    const verified = await cloudinaryAdapter.verifyUpload(creds.publicId, 'IMAGE');

    const mediaLibraryFolder = creds.publicId.slice(0, creds.publicId.lastIndexOf('/'));

    return {
      complaintId,
      mediaAssetId: creds.mediaAssetId,
      publicId: verified.publicId,
      secureUrl: verified.secureUrl,
      resourceType: verified.resourceType,
      bytes: verified.sizeBytes,
      format: verified.format,
      mediaLibraryFolder,
    };
  } catch (err) {
    // Best-effort cleanup of the disposable test complaint on failure
    await prisma.complaint.delete({ where: { id: complaintId } }).catch(() => undefined);
    throw err;
  }
}
