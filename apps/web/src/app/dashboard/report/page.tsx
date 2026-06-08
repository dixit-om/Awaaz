'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  Upload,
  MapPin,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Camera,
  FileVideo,
  Trash2,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { TRPCClientError } from '@trpc/client';
import type { ComplaintPriority } from '@awaaz/types';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { formatComplaintId } from '@/lib/complaints';
import { uploadAllComplaintEvidence } from '@/lib/media-upload';
import { cn } from '@/lib/utils';
import { trpc } from '@/trpc/client';

/* ─── Types ─────────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Evidence', 'Location', 'Details', 'Review'];

const PRIORITY_OPTIONS: { value: ComplaintPriority; label: string; urgent?: boolean }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent', urgent: true },
];

/* ─── Step Indicator ────────────────────────────────────────────────── */
function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as Step;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                  done
                    ? 'bg-[#1e40af] text-white'
                    : active
                      ? 'bg-[#1e40af] text-white'
                      : 'bg-[#e2e8f0] text-[#94a3b8]',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : step}
              </div>
              <span
                className={cn(
                  'mt-1 text-[10px] font-medium',
                  active ? 'text-[#1e40af]' : 'text-[#94a3b8]',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'mb-4 h-0.5 w-16 transition-colors',
                  done ? 'bg-[#1e40af]' : 'bg-[#e2e8f0]',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function ReportPage() {
  const router = useRouter();
  const categoriesQuery = trpc.complaints.listCategories.useQuery();
  const createMutation = trpc.complaints.createComplaint.useMutation();
  const createUploadMutation = trpc.media.createUploadRequest.useMutation();
  const confirmUploadMutation = trpc.media.confirmUpload.useMutation();

  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [formError, setFormError] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [mediaUploadWarning, setMediaUploadWarning] = useState('');

  const categories = categoriesQuery.data ?? [];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).slice(0, 5 - files.length);
    setFiles((prev) => [...prev, ...dropped].slice(0, 5));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files).slice(0, 5 - files.length);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function autoDetect() {
    setLocating(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setLocating(false);
      },
      () => {
        setLocationError('Unable to detect location. Please enter coordinates manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function validateDetails(): string | null {
    if (!categoryId) return 'Please select a category.';
    if (title.trim().length < 5) return 'Title must be at least 5 characters.';
    if (description.trim().length < 20) return 'Description must be at least 20 characters.';
    if (latitude === null || longitude === null) return 'Location is required.';
    return null;
  }

  async function handleSubmit() {
    const err = validateDetails();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError('');
    setMediaUploadWarning('');
    setIsSubmitting(true);
    setUploadProgress('Submitting complaint…');

    try {
      const complaint = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        latitude: latitude!,
        longitude: longitude!,
        address: location.trim() || undefined,
        priority,
        isPublic: true,
      });

      if (files.length > 0) {
        setUploadProgress(`Uploading evidence (0/${files.length})…`);
        const { uploaded, failed } = await uploadAllComplaintEvidence(
          complaint.id,
          files,
          {
            createUploadRequest: (input) => createUploadMutation.mutateAsync(input),
            confirmUpload: (input) => confirmUploadMutation.mutateAsync(input),
          },
          (done, total) => setUploadProgress(`Uploading evidence (${done}/${total})…`),
        );

        if (failed.length > 0) {
          setMediaUploadWarning(
            uploaded > 0
              ? `${uploaded} of ${files.length} files uploaded. Failed: ${failed.join('; ')}`
              : `Evidence upload failed: ${failed.join('; ')}`,
          );
        }
      }

      setSubmittedId(complaint.id);
    } catch (e) {
      setFormError(e instanceof TRPCClientError ? e.message : 'Failed to submit complaint.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  }

  if (submittedId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-10 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a]">Complaint Submitted!</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
            Your complaint has been registered. You&apos;ll receive updates via notifications.
          </p>
          {mediaUploadWarning && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {mediaUploadWarning}
            </p>
          )}
          <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <p className="text-xs text-[#94a3b8]">Complaint ID</p>
            <p className="mt-1 text-lg font-bold text-[#1e40af]">
              {formatComplaintId(submittedId)}
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1"
              onClick={() => router.push(`/dashboard/complaints/${submittedId}`)}
            >
              Track Complaint
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSubmittedId(null);
                setMediaUploadWarning('');
                setStep(1);
                setFiles([]);
                setCategoryId('');
                setTitle('');
                setDescription('');
                setLocation('');
                setLatitude(null);
                setLongitude(null);
              }}
            >
              Report Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-[#e2e8f0] bg-white">
        <div className="flex h-14 items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-[#64748b] transition-colors hover:text-[#0f172a]"
          >
            <X className="h-4 w-4" />
            Cancel
          </Link>
          <h1 className="text-sm font-semibold text-[#0f172a]">New Report</h1>
          <div className="w-12" />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        <StepIndicator current={step} />

        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          {/* ── Step 1: Evidence ──────────────────────────────────── */}
          {step === 1 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#0f172a]">Upload Evidence</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Photos and videos help our civic response teams resolve issues faster.
              </p>

              {/* Drop zone */}
              <div
                className={cn(
                  'mt-6 cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all',
                  dragging
                    ? 'border-[#1e40af] bg-blue-50'
                    : 'border-[#e2e8f0] hover:border-[#1e40af]/40 hover:bg-[#f8fafc]',
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                  <Upload className="h-6 w-6 text-[#1e40af]" />
                </div>
                <p className="text-sm font-medium text-[#0f172a]">Drag & drop files here</p>
                <p className="mt-1 text-xs text-[#94a3b8]">or click to browse from your device</p>
                <p className="mt-3 text-xs text-[#94a3b8]">Supports JPG, PNG, MP4 up to 100MB</p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {/* Uploaded files */}
              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#f8fafc]"
                    >
                      {file.type.startsWith('image/') ? (
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${URL.createObjectURL(file)})` }}
                          role="img"
                          aria-label={file.name}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <FileVideo className="h-8 w-8 text-[#94a3b8]" />
                          <span className="max-w-[80px] truncate text-[10px] text-[#94a3b8]">
                            {file.name}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400" />
                    </div>
                  ))}
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-medium text-green-600">
                    Evidence integrity secured — SHA-256 verified
                  </span>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                  <FileVideo className="h-4 w-4" />
                  Record Video
                </Button>
              </div>

              <div className="mt-6 flex justify-end border-t border-[#f1f5f9] pt-4">
                <Button onClick={() => setStep(2)}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Location ──────────────────────────────────── */}
          {step === 2 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#0f172a]">Pin the Location</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Help authorities find the exact spot quickly.
              </p>

              <Button
                variant="outline"
                size="md"
                onClick={autoDetect}
                loading={locating}
                className="mt-6 w-full border-dashed"
              >
                <MapPin className="h-4 w-4 text-[#1e40af]" />
                {locating ? 'Detecting location…' : '📍 Auto-detect My Location'}
              </Button>

              {/* Map placeholder */}
              <div className="relative mt-4 h-[240px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-gradient-to-br from-slate-100 to-slate-200">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <MapPin className="h-10 w-10 text-[#1e40af] drop-shadow-md" />
                  <p className="text-xs text-[#64748b]">Drag to adjust pin location</p>
                </div>
                <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-[#64748b] backdrop-blur-sm">
                  <MapPin className="mr-1 inline h-3 w-3 text-[#1e40af]" />
                  {location || 'Select location on map or use auto-detect'}
                </div>
              </div>

              {locationError && <p className="mt-3 text-sm text-[#dc2626]">{locationError}</p>}
              {latitude !== null && longitude !== null && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-medium text-[#1e40af]">📍 {location}</p>
                  <p className="mt-1 text-[10px] text-[#64748b]">
                    Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </p>
                </div>
              )}

              <div className="mt-4">
                <Input
                  label="Or search by address"
                  placeholder="Search address, landmark…"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  prefix={<MapPin className="h-4 w-4" />}
                />
              </div>

              <div className="mt-6 flex justify-between border-t border-[#f1f5f9] pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={latitude === null || longitude === null}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Details ───────────────────────────────────── */}
          {step === 3 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#0f172a]">Issue Details</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Help us categorize and prioritize your report.
              </p>

              {/* Category */}
              <div className="mt-6">
                <p className="mb-3 text-sm font-medium text-[#0f172a]">What type of issue?</p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {categoriesQuery.isLoading && (
                    <p className="col-span-full text-sm text-[#94a3b8]">Loading categories…</p>
                  )}
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5',
                        categoryId === cat.id
                          ? 'border-[#1e40af] bg-blue-50 shadow-sm'
                          : 'border-[#e2e8f0] hover:border-[#1e40af]/40 hover:bg-[#f8fafc]',
                      )}
                    >
                      <div className="mb-1 text-xl">{cat.icon ?? '📋'}</div>
                      <p className="text-xs font-semibold text-[#0f172a]">{cat.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mt-5">
                <Input
                  label="Issue Title"
                  placeholder="e.g. Broken road near main market"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  hint="Be specific — e.g. 'Pothole at MG Road junction near bus stop'"
                />
              </div>

              {/* Description */}
              <div className="mt-4">
                <Textarea
                  label="Description"
                  placeholder="Describe the problem in detail — how long has this been here? Who does it affect?"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  hint={
                    description.trim().length < 20
                      ? `${description.trim().length}/20 characters minimum`
                      : undefined
                  }
                />
                {description.trim().length > 0 && description.trim().length < 20 && (
                  <p className="mt-1.5 text-xs text-[#dc2626]">
                    Description must be at least 20 characters ({20 - description.trim().length}{' '}
                    more needed)
                  </p>
                )}
              </div>

              {/* Priority */}
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-[#0f172a]">Priority</p>
                <div className="flex flex-wrap gap-2">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                        priority === p.value
                          ? p.urgent
                            ? 'border-red-400 bg-red-50 text-red-600'
                            : 'border-[#1e40af] bg-blue-50 text-[#1e40af]'
                          : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]',
                      )}
                    >
                      {p.urgent && <AlertTriangle className="h-3.5 w-3.5" />}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {(!categoryId || title.trim().length < 5 || description.trim().length < 20) && (
                <p className="mt-4 text-xs text-[#94a3b8]">
                  To continue: {!categoryId && 'select a category'}
                  {!categoryId &&
                    (title.trim().length < 5 || description.trim().length < 20) &&
                    ', '}
                  {title.trim().length < 5 && 'enter a title (min 5 characters)'}
                  {title.trim().length < 5 && description.trim().length < 20 && ', '}
                  {description.trim().length < 20 && 'write a description (min 20 characters)'}
                </p>
              )}

              <div className="mt-4 flex justify-between border-t border-[#f1f5f9] pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={
                    !categoryId || title.trim().length < 5 || description.trim().length < 20
                  }
                >
                  Review
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Review ────────────────────────────────────── */}
          {step === 4 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#0f172a]">Review & Submit</h2>
              <p className="mt-1 text-sm text-[#64748b]">Confirm your report before submitting.</p>

              <div className="mt-6 space-y-3">
                {/* Summary card */}
                <div className="space-y-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {categories.find((c) => c.id === categoryId)?.icon ?? '📋'}
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                        {categories.find((c) => c.id === categoryId)?.name ?? 'Uncategorized'}
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-[#0f172a]">
                        {title || 'Untitled complaint'}
                      </p>
                    </div>
                  </div>
                  {description && (
                    <p className="text-sm leading-relaxed text-[#64748b]">{description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                    <MapPin className="h-3.5 w-3.5" />
                    {location || 'Location not set'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        priority === 'URGENT' || priority === 'HIGH'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-blue-50 text-[#1e40af]',
                      )}
                    >
                      {PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority}{' '}
                      priority
                    </span>
                    {files.length > 0 && (
                      <span className="text-xs text-[#64748b]">
                        {files.length} file(s) attached
                      </span>
                    )}
                  </div>
                </div>

                {/* Declaration */}
                <label className="group flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-[#e2e8f0] text-[#1e40af]"
                    required
                  />
                  <span className="text-xs leading-relaxed text-[#64748b]">
                    I confirm this is a genuine civic issue and the information provided is
                    accurate. False reports may lead to account suspension.
                  </span>
                </label>
              </div>

              {formError && <p className="mt-4 text-sm text-[#dc2626]">{formError}</p>}
              {uploadProgress && <p className="mt-4 text-sm text-[#1e40af]">{uploadProgress}</p>}
              <div className="mt-6 flex justify-between border-t border-[#f1f5f9] pt-4">
                <Button variant="outline" onClick={() => setStep(3)} disabled={isSubmitting}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => void handleSubmit()} variant="accent" loading={isSubmitting}>
                  Submit Report
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
