import type { CreateUploadRequestResult } from '@awaaz/types';
import type { ConfirmUploadSchema, CreateUploadRequestSchema } from '@awaaz/validation';
import { getEvidenceMediaType, type EvidenceMediaType } from '@/lib/media-validation';

/** Normalise browser MIME quirks to values accepted by the API. */
export function normalizeMimeType(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'mov') return 'video/quicktime';

  if (file.type === 'image/jpg') return 'image/jpeg';
  if (file.type) return file.type;
  return 'image/jpeg';
}

export function getMediaTypeFromFile(file: File): EvidenceMediaType | null {
  return getEvidenceMediaType(file);
}

export type UploadFailure = { file: File; error: string };

/** Compute SHA-256 hex digest of a file using the Web Crypto API. */
export async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  bytes?: number;
  duration?: number;
}

async function postToCloudinary(
  file: File,
  creds: CreateUploadRequestResult,
): Promise<CloudinaryUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', creds.apiKey);
  form.append('timestamp', String(creds.timestamp));
  form.append('signature', creds.signature);
  form.append('public_id', creds.publicId);
  form.append('upload_preset', creds.uploadPreset);
  form.append('allowed_formats', creds.allowedFormats);

  const res = await fetch(creds.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      body.includes('Invalid cloud_name') || body.includes('dev-placeholder')
        ? 'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.'
        : `Cloudinary upload failed: ${body.slice(0, 200)}`,
    );
  }
  return res.json() as Promise<CloudinaryUploadResponse>;
}

export interface MediaUploadMutations {
  createUploadRequest: (input: CreateUploadRequestSchema) => Promise<CreateUploadRequestResult>;
  confirmUpload: (input: ConfirmUploadSchema) => Promise<unknown>;
}

/**
 * Full direct-upload flow for a single evidence file:
 *   1. Request signed credentials from the server
 *   2. Upload bytes directly to Cloudinary
 *   3. Confirm upload with the server (stores metadata + SHA-256)
 */
export type UploadStage = 'hashing' | 'credentials' | 'cloudinary' | 'confirm';

export async function uploadComplaintEvidence(
  complaintId: string,
  file: File,
  mutations: MediaUploadMutations,
  onStage?: (stage: UploadStage) => void,
): Promise<void> {
  const mimeType = normalizeMimeType(file);
  const mediaType = getMediaTypeFromFile(file);
  if (!mediaType) {
    throw new Error(`Unsupported file type: ${file.type || file.name}`);
  }

  onStage?.('hashing');
  const sha256Hash = await computeFileSha256(file);

  onStage?.('credentials');
  const creds = await mutations.createUploadRequest({
    complaintId,
    mediaType,
    fileName: file.name,
    mimeType: mimeType as CreateUploadRequestSchema['mimeType'],
    sizeBytes: file.size,
    sha256HashEarly: sha256Hash,
  });

  onStage?.('cloudinary');
  const cloudRes = await postToCloudinary(file, creds);

  onStage?.('confirm');
  await mutations.confirmUpload({
    mediaAssetId: creds.mediaAssetId,
    publicId: creds.publicId,
    secureUrl: cloudRes.secure_url,
    sha256Hash,
    metadata: {
      width: cloudRes.width,
      height: cloudRes.height,
      durationSec: cloudRes.duration ? Math.round(cloudRes.duration) : undefined,
      sizeBytes: cloudRes.bytes,
    },
  });
}

/** Upload multiple files sequentially (Cloudinary rate-limit friendly). */
const STAGE_LABELS: Record<UploadStage, string> = {
  hashing: 'Preparing file',
  credentials: 'Requesting upload credentials',
  cloudinary: 'Uploading to cloud storage',
  confirm: 'Saving evidence',
};

const STAGE_PERCENT: Record<UploadStage, number> = {
  hashing: 10,
  credentials: 30,
  cloudinary: 60,
  confirm: 85,
};

export async function uploadAllComplaintEvidence(
  complaintId: string,
  files: File[],
  mutations: MediaUploadMutations,
  onProgress?: UploadProgressCallback,
): Promise<{ uploaded: number; failed: UploadFailure[] }> {
  const failed: UploadFailure[] = [];
  let uploaded = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const fileIndex = i + 1;
    try {
      await uploadComplaintEvidence(complaintId, file, mutations, (stage) => {
        const base = ((fileIndex - 1) / files.length) * 100;
        const slice = (1 / files.length) * 100;
        const percent = Math.round(base + (slice * STAGE_PERCENT[stage]) / 100);
        onProgress?.(
          fileIndex - 1,
          files.length,
          `${STAGE_LABELS[stage]} (${fileIndex}/${files.length})…`,
          percent,
        );
      });
      uploaded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      failed.push({ file, error: msg });
    }
    onProgress?.(fileIndex, files.length, `Uploaded ${fileIndex}/${files.length}`, 100);
  }

  return { uploaded, failed };
}

export type UploadProgressCallback = (
  done: number,
  total: number,
  label?: string,
  percent?: number,
) => void;

/** Retry a subset of failed uploads after partial success. */
export async function retryComplaintEvidenceUploads(
  complaintId: string,
  files: File[],
  mutations: MediaUploadMutations,
  onProgress?: UploadProgressCallback,
): Promise<{ uploaded: number; failed: UploadFailure[] }> {
  return uploadAllComplaintEvidence(complaintId, files, mutations, onProgress);
}
