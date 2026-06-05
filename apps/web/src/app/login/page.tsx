'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Megaphone, Phone, Shield } from 'lucide-react';
import { TRPCClientError } from '@trpc/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { trpc } from '@/trpc/client';
import type { UserRole } from '@awaaz/types';

// ─── Role → home mapping ──────────────────────────────────────────────
const ROLE_HOME: Record<UserRole, string> = {
  citizen: '/dashboard',
  mla: '/mla',
  admin: '/admin',
};

type Step = 'phone' | 'otp';

// ─── Helpers ──────────────────────────────────────────────────────────
function extractTrpcMessage(err: unknown, fallback: string): string {
  if (err instanceof TRPCClientError) return err.message;
  return fallback;
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maskedPhone = phone ? `+91 ${phone.slice(0, 2)}XXX XX${phone.slice(-2)}` : '';

  // ── Redirect already-authenticated users ──────────────────────────
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [isAuthenticated, user, router]);

  // ── Countdown timer ───────────────────────────────────────────────
  function startCountdown(seconds = 45) {
    setCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  useEffect(
    () => () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    },
    [],
  );

  // ── sendOTP mutation ──────────────────────────────────────────────
  const sendOtpMutation = trpc.auth.sendOTP.useMutation({
    onSuccess: (data) => {
      setStep('otp');
      startCountdown(data.expiresInSeconds > 0 ? Math.min(data.expiresInSeconds, 120) : 45);
      setPhoneError('');
    },
    onError: (err) => {
      const msg = extractTrpcMessage(err, 'Failed to send OTP. Please try again.');
      if (err instanceof TRPCClientError && err.data?.code === 'TOO_MANY_REQUESTS') {
        setPhoneError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setPhoneError(msg);
      }
    },
  });

  // ── verifyOTP mutation ────────────────────────────────────────────
  const verifyOtpMutation = trpc.auth.verifyOTP.useMutation({
    onSuccess: (data) => {
      login(
        {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
        },
        data.user,
      );
      router.replace(ROLE_HOME[data.user.role]);
    },
    onError: (err) => {
      if (err instanceof TRPCClientError) {
        const code = err.data?.code as string | undefined;
        if (code === 'TOO_MANY_REQUESTS') {
          setOtpError('Too many attempts. Please request a new OTP.');
        } else if (err.message.toLowerCase().includes('expired')) {
          setOtpError('OTP has expired. Please request a new one.');
        } else if (err.message.toLowerCase().includes('invalid')) {
          setOtpError('Incorrect OTP. Please check and try again.');
        } else {
          setOtpError(extractTrpcMessage(err, 'Verification failed. Please try again.'));
        }
      } else {
        setOtpError('Network error. Please check your connection and try again.');
      }
      // Clear OTP boxes on error so the user can re-enter.
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length < 10) return;
    setPhoneError('');
    sendOtpMutation.mutate({ phoneNumber: `+91${phone}` });
  }

  function handleResendOtp() {
    setOtpError('');
    setOtp(['', '', '', '', '', '']);
    sendOtpMutation.mutate({ phoneNumber: `+91${phone}` });
  }

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    setOtpError('');
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 6) return;
    setOtpError('');
    verifyOtpMutation.mutate({
      phoneNumber: `+91${phone}`,
      otp: otpValue,
    });
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* ── Left branding panel (desktop only) ──────────────────── */}
      <div className="hidden w-[520px] flex-shrink-0 flex-col justify-between bg-[#0f172a] p-12 lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e40af]">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AWAAZ</span>
          </Link>
          <p className="mt-2 text-sm text-[#94a3b8]">Civic Engagement Platform</p>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight text-white">
            Your voice shapes <span className="text-[#f59e0b]">better cities.</span>
          </h2>
          <p className="mt-4 leading-relaxed text-[#64748b]">
            Report issues, track resolutions, and hold authorities accountable — all from your
            phone.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { stat: '50,000+', label: 'Issues resolved' },
              { stat: '92%', label: 'Authority response rate' },
              { stat: '1.2M', label: 'Active citizens' },
            ].map((item) => (
              <div key={item.stat} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <span className="text-sm font-bold text-white">{item.stat}</span>
                </div>
                <span className="text-sm text-[#64748b]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#475569]">© 2026 AWAAZ GovTech Platform</p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e40af]">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[#0f172a]">AWAAZ</span>
          </div>

          {/* ── Step 1: Phone ──────────────────────────────────── */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} noValidate>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#0f172a]">Login with mobile number</h1>
                <p className="mt-2 text-sm text-[#64748b]">
                  No sign-up needed — just verify your number
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#0f172a]">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="flex h-11 flex-shrink-0 items-center gap-2 rounded-[10px] border border-[#e2e8f0] bg-white px-3 text-sm font-medium text-[#0f172a]">
                      🇮🇳 +91
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setPhoneError('');
                      }}
                      placeholder="9876543210"
                      disabled={sendOtpMutation.isPending}
                      className="h-11 flex-1 rounded-[10px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a] transition-colors placeholder:text-[#94a3b8] focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10 disabled:opacity-60"
                    />
                  </div>
                  {phoneError && <p className="mt-1.5 text-xs text-red-500">{phoneError}</p>}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  loading={sendOtpMutation.isPending}
                  disabled={phone.length < 10}
                  className="w-full"
                >
                  Send OTP
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#94a3b8]" />
                <p className="text-xs text-[#94a3b8]">
                  We only use your number to send OTPs. No spam, no data selling.
                </p>
              </div>

              <div className="mt-8 border-t border-[#e2e8f0] pt-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">
                  Are you an authority?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs text-[#64748b] transition-colors hover:bg-[#f8fafc]"
                  >
                    MLA / Authority Login
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs text-[#64748b] transition-colors hover:bg-[#f8fafc]"
                  >
                    Admin Panel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── Step 2: OTP ────────────────────────────────────── */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} noValidate>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp(['', '', '', '', '', '']);
                  setOtpError('');
                }}
                className="mb-8 flex items-center gap-1.5 text-sm text-[#64748b] transition-colors hover:text-[#0f172a]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="mb-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-[#0f172a]">Verify your number</h1>
                <p className="mt-2 text-sm text-[#64748b]">
                  OTP sent to <strong className="text-[#0f172a]">{maskedPhone}</strong>
                </p>
              </div>

              {/* 6-digit OTP boxes */}
              <div className="mb-2 flex justify-center gap-2.5">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={verifyOtpMutation.isPending}
                    className={`h-14 w-12 rounded-[10px] border-2 bg-white text-center text-xl font-bold text-[#0f172a] transition-all focus:outline-none focus:ring-2 disabled:opacity-60 ${
                      otpError
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                        : 'border-[#e2e8f0] focus:border-[#1e40af] focus:ring-[#1e40af]/10'
                    }`}
                  />
                ))}
              </div>

              {/* OTP error */}
              {otpError && <p className="mb-4 text-center text-xs text-red-500">{otpError}</p>}

              <Button
                type="submit"
                size="lg"
                loading={verifyOtpMutation.isPending}
                disabled={otp.join('').length < 6}
                className="mt-4 w-full"
              >
                Verify &amp; Login
              </Button>

              {/* Countdown / Resend */}
              <div className="mt-4 text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-[#94a3b8]">
                    Resend OTP in <strong className="text-[#64748b]">{countdown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={sendOtpMutation.isPending}
                    className="text-sm font-medium text-[#1e40af] hover:underline disabled:opacity-60"
                  >
                    {sendOtpMutation.isPending ? 'Sending…' : 'Resend OTP'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
