import type { CreateUploadRequestResult } from '@awaaz/types';
import type { ConfirmUploadSchema, CreateUploadRequestSchema } from '@awaaz/validation';

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'] as const;

/** Normalise browser MIME quirks to values accepted by the API. */
export function normalizeMimeType(file: File): string {
  if (file.type === 'image/jpg' || file.type === '') {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'heic' || ext === 'heif') return 'image/heic';
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    return 'image/jpeg';
  }
  return file.type;
}

export function getMediaTypeFromFile(file: File): 'IMAGE' | 'VIDEO' | null {
  const mime = normalizeMimeType(file);
  if ((ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime)) return 'IMAGE';
  if ((ALLOWED_VIDEO_MIMES as readonly string[]).includes(mime)) return 'VIDEO';
  return null;
}

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
  form.append('folder', creds.folder);
  form.append('upload_preset', creds.uploadPreset);
  form.append('allowed_formats', creds.allowedFormats);
  if (creds.maxBytes) form.append('max_bytes', String(creds.maxBytes));

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
export async function uploadComplaintEvidence(
  complaintId: string,
  file: File,
  mutations: MediaUploadMutations,
): Promise<void> {
  const mimeType = normalizeMimeType(file);
  const mediaType = getMediaTypeFromFile(file);
  if (!mediaType) {
    throw new Error(`Unsupported file type: ${file.type || file.name}`);
  }

  const sha256Hash = await computeFileSha256(file);

  const creds = await mutations.createUploadRequest({
    complaintId,
    mediaType,
    fileName: file.name,
    mimeType: mimeType as CreateUploadRequestSchema['mimeType'],
    sizeBytes: file.size,
    sha256HashEarly: sha256Hash,
  });

  const cloudRes = await postToCloudinary(file, creds);

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
export async function uploadAllComplaintEvidence(
  complaintId: string,
  files: File[],
  mutations: MediaUploadMutations,
  onProgress?: (done: number, total: number) => void,
): Promise<{ uploaded: number; failed: string[] }> {
  const failed: string[] = [];
  let uploaded = 0;

  for (let i = 0; i < files.length; i++) {
    try {
      await uploadComplaintEvidence(complaintId, files[i]!, mutations);
      uploaded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      failed.push(`${files[i]!.name}: ${msg}`);
    }
    onProgress?.(i + 1, files.length);
  }

  return { uploaded, failed };
}
