'use client';

import { useState } from 'react';
import { Camera, FileVideo, ImageOff, Loader2, Play, X } from 'lucide-react';
import type { MediaAssetEmbed, MediaAssetPublicDTO } from '@awaaz/types';
import { formatDateTime } from '@/lib/complaints';
import { cn } from '@/lib/utils';
import { trpc } from '@/trpc/client';

type GalleryAsset = MediaAssetEmbed | MediaAssetPublicDTO;

interface MediaGalleryProps {
  complaintId: string;
  className?: string;
}

function isReadyAsset(asset: GalleryAsset): boolean {
  if (!asset.secureUrl) return false;
  // Public DTOs are pre-filtered to READY + APPROVED by the API.
  if (!('status' in asset)) return true;
  return asset.status === 'READY';
}

function getThumbnailUrl(asset: GalleryAsset): string {
  return asset.thumbnailUrl ?? asset.secureUrl;
}

function MediaPreviewModal({ asset, onClose }: { asset: GalleryAsset; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Evidence preview"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-[#0f172a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex max-h-[80vh] items-center justify-center bg-black">
          {asset.mediaType === 'VIDEO' ? (
            <video
              src={asset.secureUrl}
              controls
              playsInline
              className="max-h-[80vh] w-full"
              poster={asset.thumbnailUrl ?? undefined}
            />
          ) : (
            <div
              className="h-full min-h-[200px] w-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${asset.secureUrl})` }}
              role="img"
              aria-label="Complaint evidence"
            />
          )}
        </div>

        <div className="border-t border-white/10 px-4 py-3 text-xs text-[#94a3b8]">
          Uploaded {formatDateTime(asset.uploadedAt)}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
          {asset.durationSec ? ` · ${asset.durationSec}s` : ''}
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex aspect-square animate-pulse items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc]"
        >
          <Loader2 className="h-5 w-5 animate-spin text-[#94a3b8]" />
        </div>
      ))}
    </div>
  );
}

export function MediaGallery({ complaintId, className }: MediaGalleryProps) {
  const [previewAsset, setPreviewAsset] = useState<GalleryAsset | null>(null);

  const query = trpc.media.getMediaByComplaint.useQuery(
    { complaintId },
    { staleTime: 60_000, refetchOnWindowFocus: false },
  );

  if (query.isLoading) {
    return (
      <div className={className}>
        <LoadingGrid />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50 py-8 text-center',
          className,
        )}
      >
        <ImageOff className="h-8 w-8 text-red-400" />
        <p className="text-sm font-medium text-red-700">Could not load evidence</p>
        <p className="text-xs text-red-600">{query.error.message}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-1 text-xs font-medium text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const assets = (query.data?.assets ?? []).filter(isReadyAsset);

  if (assets.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] py-10 text-center',
          className,
        )}
      >
        <Camera className="h-8 w-8 text-[#94a3b8]" />
        <p className="text-sm font-medium text-[#64748b]">No evidence uploaded yet</p>
        <p className="text-xs text-[#94a3b8]">Photos and videos will appear here once submitted.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => setPreviewAsset(asset)}
            className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-left transition-shadow hover:shadow-md"
          >
            {asset.mediaType === 'VIDEO' ? (
              <>
                {asset.thumbnailUrl ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${asset.thumbnailUrl})` }}
                    role="img"
                    aria-label="Video thumbnail"
                  />
                ) : (
                  <FileVideo className="h-8 w-8 text-[#94a3b8]" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </div>
                </div>
              </>
            ) : (
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${getThumbnailUrl(asset)})` }}
                role="img"
                aria-label="Evidence"
              />
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
              <p className="truncate text-[10px] text-white/90">
                {formatDateTime(asset.uploadedAt)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {previewAsset && (
        <MediaPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
}
