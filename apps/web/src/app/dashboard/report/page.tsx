'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Evidence', 'Location', 'Details', 'Review'];

const CATEGORIES = [
  {
    slug: 'garbage',
    label: 'Garbage Issues',
    emoji: '🗑️',
    desc: 'Overflowing bins, illegal dumping',
  },
  { slug: 'road', label: 'Road Issues', emoji: '🛣️', desc: 'Potholes, damaged pavement' },
  { slug: 'water', label: 'Water Problems', emoji: '💧', desc: 'Leaks, supply interruptions' },
  { slug: 'electricity', label: 'Electricity', emoji: '⚡', desc: 'Outages, damaged lines' },
  { slug: 'drainage', label: 'Drainage', emoji: '🚰', desc: 'Blocked drains, flooding' },
  {
    slug: 'infrastructure',
    label: 'Infrastructure',
    emoji: '🏗️',
    desc: 'Buildings, public facilities',
  },
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
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [submitted, setSubmitted] = useState(false);

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
    setTimeout(() => {
      setLocation('Sector 14, MG Road, Gurgaon, Haryana 122001');
      setLocating(false);
    }, 1500);
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  if (submitted) {
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
          <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <p className="text-xs text-[#94a3b8]">Complaint ID</p>
            <p className="mt-1 text-lg font-bold text-[#1e40af]">#AWZ-04825</p>
          </div>
          <div className="mt-6 flex gap-3">
            <Link href={`/dashboard/complaints/#AWZ-04825`} className="flex-1">
              <Button className="w-full">Track Complaint</Button>
            </Link>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSubmitted(false);
                setStep(1);
                setFiles([]);
                setCategory('');
                setTitle('');
                setDescription('');
                setLocation('');
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

              {location && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-medium text-[#1e40af]">📍 {location}</p>
                  <p className="mt-1 text-[10px] text-[#64748b]">
                    Constituency: Gurgaon · MLA: Suresh Gupta
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
                <Button onClick={() => setStep(3)}>
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
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setCategory(cat.slug)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5',
                        category === cat.slug
                          ? 'border-[#1e40af] bg-blue-50 shadow-sm'
                          : 'border-[#e2e8f0] hover:border-[#1e40af]/40 hover:bg-[#f8fafc]',
                      )}
                    >
                      <div className="mb-1 text-xl">{cat.emoji}</div>
                      <p className="text-xs font-semibold text-[#0f172a]">{cat.label}</p>
                      <p className="mt-0.5 text-[10px] text-[#94a3b8]">{cat.desc}</p>
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
                  label="Description (optional)"
                  placeholder="Describe the problem in detail — how long has this been here? Who does it affect?"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                />
              </div>

              {/* Priority */}
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-[#0f172a]">Priority</p>
                <div className="flex gap-2">
                  {(['normal', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                        priority === p
                          ? p === 'urgent'
                            ? 'border-red-400 bg-red-50 text-red-600'
                            : 'border-[#1e40af] bg-blue-50 text-[#1e40af]'
                          : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]',
                      )}
                    >
                      {p === 'urgent' && <AlertTriangle className="h-3.5 w-3.5" />}
                      {p === 'normal' ? 'Normal' : 'Urgent'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-between border-t border-[#f1f5f9] pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(4)} disabled={!category || !title}>
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
                      {CATEGORIES.find((c) => c.slug === category)?.emoji ?? '📋'}
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                        {CATEGORIES.find((c) => c.slug === category)?.label ?? 'Uncategorized'}
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
                        priority === 'urgent'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-blue-50 text-[#1e40af]',
                      )}
                    >
                      {priority === 'urgent' ? '⚡ Urgent' : 'Normal priority'}
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

              <div className="mt-6 flex justify-between border-t border-[#f1f5f9] pt-4">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleSubmit} variant="accent">
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
