/** Client-side evidence validation — mirrors civic upload policy for the report UI. */

export const MAX_EVIDENCE_FILES = 5;
export const MAX_VIDEO_FILES = 3;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov']);

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime']);

export type EvidenceMediaType = 'IMAGE' | 'VIDEO';

export function getEvidenceMediaType(file: File): EvidenceMediaType | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type.toLowerCase();

  if (IMAGE_EXTENSIONS.has(ext) || IMAGE_MIMES.has(mime)) return 'IMAGE';
  if (VIDEO_EXTENSIONS.has(ext) || VIDEO_MIMES.has(mime)) return 'VIDEO';
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateEvidenceFile(
  file: File,
  existingFiles: File[],
): { valid: true; mediaType: EvidenceMediaType } | { valid: false; error: string } {
  const mediaType = getEvidenceMediaType(file);
  if (!mediaType) {
    return {
      valid: false,
      error: `"${file.name}" is not supported. Use JPG, PNG, WebP, MP4, or MOV.`,
    };
  }

  const maxBytes = mediaType === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `"${file.name}" exceeds the ${mediaType === 'IMAGE' ? '10 MB' : '50 MB'} limit (${formatFileSize(file.size)}).`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: `"${file.name}" is empty.` };
  }

  const duplicate = existingFiles.some(
    (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified,
  );
  if (duplicate) {
    return { valid: false, error: `"${file.name}" is already selected.` };
  }

  return { valid: true, mediaType };
}

export function validateEvidenceSelection(files: File[]): string | null {
  if (files.length > MAX_EVIDENCE_FILES) {
    return `You can attach up to ${MAX_EVIDENCE_FILES} files per complaint.`;
  }

  const videoCount = files.filter((f) => getEvidenceMediaType(f) === 'VIDEO').length;
  if (videoCount > MAX_VIDEO_FILES) {
    return `You can attach up to ${MAX_VIDEO_FILES} videos per complaint.`;
  }

  return null;
}
