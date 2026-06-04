import Link from 'next/link';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  MapPin,
  Shield,
  Zap,
  Users,
  ChevronRight,
  Megaphone,
  MessageSquare,
  Globe,
  BarChart3,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* ─── Mock data ─────────────────────────────────────────────────────── */
const STATS = [
  { label: 'Issues Resolved', value: '50,000+', icon: CheckCircle2, accent: true },
  { label: 'Authority Response Rate', value: '92%', icon: Zap, accent: false },
  { label: 'Citizens Active', value: '1.2M', icon: Users, accent: false },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Report',
    desc: 'Snap a photo, pin the location, and submit your observation in seconds.',
    icon: Camera,
    color: 'bg-blue-50 text-[#1e40af]',
  },
  {
    step: '2',
    title: 'Resolve',
    desc: 'Authorities are notified instantly and work is tracked transparently.',
    icon: Zap,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    step: '3',
    title: 'Verify',
    desc: 'The community verifies the completion, closing the loop on the issue.',
    icon: CheckCircle2,
    color: 'bg-green-50 text-green-600',
  },
];

const CATEGORIES = [
  {
    slug: 'garbage',
    label: 'Garbage Issues',
    emoji: '🗑️',
    count: 1284,
    color: 'bg-orange-50 border-orange-100',
  },
  {
    slug: 'road',
    label: 'Road Issues',
    emoji: '🛣️',
    count: 2156,
    color: 'bg-blue-50 border-blue-100',
  },
  {
    slug: 'water',
    label: 'Water Problems',
    emoji: '💧',
    count: 987,
    color: 'bg-cyan-50 border-cyan-100',
  },
  {
    slug: 'electricity',
    label: 'Electricity',
    emoji: '⚡',
    count: 743,
    color: 'bg-yellow-50 border-yellow-100',
  },
  {
    slug: 'drainage',
    label: 'Drainage',
    emoji: '🚰',
    count: 621,
    color: 'bg-teal-50 border-teal-100',
  },
  {
    slug: 'infrastructure',
    label: 'Infrastructure',
    emoji: '🏗️',
    count: 534,
    color: 'bg-purple-50 border-purple-100',
  },
];

const RECENT_RESOLVED = [
  {
    id: '#AWZ-04821',
    title: 'Pothole repaired on MG Road',
    category: 'Road',
    location: 'Sector 14, Gurgaon',
    before: true,
    after: true,
  },
  {
    id: '#AWZ-04819',
    title: 'Street lights restored',
    category: 'Electricity',
    location: 'Park Avenue, Ward 7',
    before: true,
    after: true,
  },
  {
    id: '#AWZ-04815',
    title: 'Garbage cleared from main market',
    category: 'Garbage',
    location: 'Civil Lines, Allahabad',
    before: true,
    after: true,
  },
  {
    id: '#AWZ-04812',
    title: 'Water supply pipeline fixed',
    category: 'Water',
    location: 'Residential Colony, Bhopal',
    before: true,
    after: true,
  },
];

const LEADERBOARD = [
  { rank: 1, name: 'Central Ward', score: 94, resolved: 412, badge: 'gold' },
  { rank: 2, name: 'Westside District', score: 88, resolved: 389, badge: 'silver' },
  { rank: 3, name: 'Pine Valley', score: 82, resolved: 341, badge: 'bronze' },
  { rank: 4, name: 'Bengaluru North', score: 78, resolved: 298, badge: '' },
  { rank: 5, name: 'Andheri East', score: 74, resolved: 267, badge: '' },
];

const BADGE_COLOURS: Record<string, string> = {
  gold: 'bg-yellow-400 text-yellow-900',
  silver: 'bg-slate-300 text-slate-700',
  bronze: 'bg-orange-300 text-orange-900',
};

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8 lg:pb-32 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1e40af]" />
                <span className="text-xs font-medium text-[#1e40af]">GOVTECH PLATFORM</span>
              </div>

              <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-[#0f172a] lg:text-6xl">
                Your Voice, <span className="text-[#1e40af]">Our Action.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#64748b]">
                Empowering citizens to report, track, and verify local civic improvements in
                real-time. Join the movement for transparent governance.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login">
                  <Button size="lg" className="group">
                    Report an Issue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Link href="/transparency">
                  <Button variant="outline" size="lg">
                    <Globe className="h-4 w-4" />
                    View Transparency Map
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 flex items-center gap-6">
                {STATS.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold text-[#0f172a]">{s.value}</p>
                    <p className="mt-0.5 text-xs text-[#64748b]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e40af] to-[#1d4ed8]">
                {/* City image placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-blue-800/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/30">
                    <MapPin className="mx-auto mb-3 h-16 w-16" />
                    <p className="text-sm">Civic Map Preview</p>
                  </div>
                </div>

                {/* Floating recent update card */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl bg-white p-3 shadow-xl">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#0f172a]">Recent Update</p>
                    <p className="truncate text-xs text-[#64748b]">Pothole Repaired – Ward 4</p>
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-[#94a3b8]">Just now</span>
                </div>
              </div>

              {/* Floating stat cards */}
              <div className="absolute -right-4 -top-4 min-w-[100px] rounded-xl border border-[#e2e8f0] bg-white p-3 text-center shadow-lg">
                <p className="text-2xl font-bold text-[#1e40af]">92%</p>
                <p className="mt-0.5 text-[10px] text-[#64748b]">Response Rate</p>
              </div>
              <div className="absolute -bottom-4 -left-4 min-w-[100px] rounded-xl border border-[#e2e8f0] bg-white p-3 text-center shadow-lg">
                <p className="text-2xl font-bold text-green-600">50K+</p>
                <p className="mt-0.5 text-[10px] text-[#64748b]">Issues Resolved</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────── */}
      <section className="border-y border-[#e2e8f0] bg-[#f8fafc] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
            <div>
              <p className="text-4xl font-bold text-[#0f172a]">50,000+</p>
              <p className="mt-1 text-sm text-[#64748b]">Issues Resolved</p>
            </div>
            <div className="border-[#e2e8f0] md:border-x">
              <p className="text-4xl font-bold text-[#1e40af]">92%</p>
              <p className="mt-1 text-sm text-[#64748b]">Authority Response Rate</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[#0f172a]">1.2M</p>
              <p className="mt-1 text-sm text-[#64748b]">Citizens Active</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bridging section ──────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold leading-tight text-[#0f172a] lg:text-4xl">
                Bridging the gap between citizens and authorities.
              </h2>
              <p className="mt-4 leading-relaxed text-[#64748b]">
                Our platform ensures every report is tracked, categorized, and forwarded to the
                right department. Transparency isn&apos;t just a promise; it&apos;s engineered into
                our workflow.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: Shield, text: 'Accountability built into every step' },
                  { icon: BarChart3, text: 'Real-time analytics and governance metrics' },
                  {
                    icon: MessageSquare,
                    text: 'Citizens verify resolution — not just authorities',
                  },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <item.icon className="h-4 w-4 text-[#1e40af]" />
                    </div>
                    <p className="text-sm text-[#64748b]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: '50K+', label: 'Issues Resolved', bg: 'bg-[#f8fafc]' },
                {
                  value: '92%',
                  label: 'Response Rate',
                  bg: 'bg-[#1e40af] text-white',
                  textMuted: 'text-blue-200',
                },
                { value: '1.2M', label: 'Citizens', bg: 'bg-[#f8fafc]' },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`flex aspect-square flex-col items-center justify-center rounded-2xl border border-[#e2e8f0] p-5 text-center ${card.bg}`}
                >
                  <p
                    className={`text-2xl font-bold ${card.bg.includes('1e40af') ? 'text-white' : 'text-[#0f172a]'}`}
                  >
                    {card.value}
                  </p>
                  <p
                    className={`mt-1 text-xs ${card.bg.includes('1e40af') ? 'text-blue-200' : 'text-[#64748b]'}`}
                  >
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section className="bg-[#f8fafc] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[#0f172a]">How It Works</h2>
            <p className="mt-3 text-[#64748b]">
              A streamlined process designed for efficiency and accountability.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute left-[calc(50%+2rem)] top-8 hidden h-0.5 w-full bg-gradient-to-r from-[#e2e8f0] to-transparent md:block" />
                )}
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 text-center shadow-sm">
                  <div
                    className={`h-14 w-14 rounded-2xl ${step.color} mx-auto mb-4 flex items-center justify-center`}
                  >
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-[#0f172a]">
                    {step.step}. {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#0f172a]">Browse by Category</h2>
              <p className="mt-2 text-[#64748b]">Find and track issues by civic category</p>
            </div>
            <Link
              href="/transparency"
              className="flex items-center gap-1 text-sm font-medium text-[#1e40af] transition-all hover:gap-2"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/transparency?category=${cat.slug}`}
                className={`rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${cat.color}`}
              >
                <div className="mb-2 text-3xl">{cat.emoji}</div>
                <p className="text-sm font-medium text-[#0f172a]">{cat.label}</p>
                <p className="mt-1 text-xs text-[#64748b]">{cat.count.toLocaleString()} open</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Impact ─────────────────────────────────────────── */}
      <section className="bg-[#f8fafc] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr,380px]">
            {/* Recent resolved */}
            <div>
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-[#0f172a]">Recent Impact</h2>
                  <p className="mt-1 text-[#64748b]">Verified improvements in your area.</p>
                </div>
                <Link
                  href="/transparency"
                  className="flex items-center gap-1 text-sm font-medium text-[#1e40af] transition-all hover:gap-2"
                >
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {RECENT_RESOLVED.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white transition-shadow hover:shadow-md"
                  >
                    <div className="grid h-28 grid-cols-2">
                      <div className="relative flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                        <span className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          BEFORE
                        </span>
                        <div className="h-8 w-8 rounded-full bg-white/20" />
                      </div>
                      <div className="relative flex items-center justify-center bg-gradient-to-br from-green-200 to-green-300">
                        <span className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          AFTER
                        </span>
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold leading-tight text-[#0f172a]">
                        {item.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge variant="resolved" className="px-1.5 py-0 text-[10px]">
                          {item.category}
                        </Badge>
                        <span className="truncate text-[10px] text-[#94a3b8]">{item.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard preview */}
            <div>
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-[#0f172a]">Top Constituencies</h2>
                  <p className="mt-1 text-[#64748b]">Based on resolution speed & volume.</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
                {LEADERBOARD.map((entry, i) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-4 px-4 py-3.5 ${i < LEADERBOARD.length - 1 ? 'border-b border-[#f1f5f9]' : ''}`}
                  >
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${entry.badge ? BADGE_COLOURS[entry.badge] : 'bg-[#f1f5f9] text-[#64748b]'}`}
                    >
                      {entry.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0f172a]">{entry.name}</p>
                      <p className="text-xs text-[#94a3b8]">{entry.resolved} resolved</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-[#0f172a]">{entry.score}%</p>
                      <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[#f1f5f9]">
                        <div
                          className="h-full rounded-full bg-[#1e40af]"
                          style={{ width: `${entry.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
                  <Link
                    href="/leaderboard"
                    className="flex items-center justify-center gap-1 text-sm font-medium text-[#1e40af] transition-all hover:gap-2"
                  >
                    VIEW FULL LEADERBOARD <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#1e40af] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Megaphone className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white lg:text-4xl">Your city needs your voice.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-200">
            Join 1.2 million citizens already making a difference. Report an issue today and be part
            of the change.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login">
              <Button variant="accent" size="lg" className="shadow-lg">
                Report an Issue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/transparency">
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                View Public Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-[#0f172a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e40af]">
                  <Megaphone className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">AWAAZ</span>
              </div>
              <p className="text-sm leading-relaxed text-[#64748b]">
                Civic Engagement & Governance Transparency Platform
              </p>
            </div>
            {[
              {
                heading: 'Platform',
                links: ['Report Issue', 'Track Complaint', 'Leaderboard', 'Transparency Map'],
              },
              {
                heading: 'Governance',
                links: ['MLA Portal', 'Authority Login', 'Performance Stats', 'RTI Support'],
              },
              {
                heading: 'Company',
                links: ['About AWAAZ', 'Privacy Policy', 'Terms of Service', 'Contact Support'],
              },
            ].map((col) => (
              <div key={col.heading}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                  {col.heading}
                </p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-[#64748b] transition-colors hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-white/8 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
            <p className="text-sm text-[#475569]">
              © 2026 AWAAZ GovTech Platform. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm text-[#475569] transition-colors hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-[#475569] transition-colors hover:text-white">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-[#475569] transition-colors hover:text-white">
                Open Data Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
