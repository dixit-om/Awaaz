'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Megaphone, Phone, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const maskedPhone = phone ? `+91 ${phone.slice(0, 2)}XXX XX${phone.slice(-2)}` : '';

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length < 10) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      setCountdown(45);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }, 1200);
  }

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`);
      el?.focus();
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const el = document.getElementById(`otp-${idx - 1}`);
      el?.focus();
    }
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.join('').length < 6) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      window.location.href = '/dashboard';
    }, 1500);
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Left panel */}
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
                <div className="bg-white/8 flex h-10 w-10 items-center justify-center rounded-lg">
                  <span className="text-sm font-bold text-white">{item.stat}</span>
                </div>
                <span className="text-sm text-[#64748b]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-[#475569]">© 2026 AWAAZ GovTech Platform</div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e40af]">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[#0f172a]">AWAAZ</span>
          </div>

          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit}>
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
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="h-11 flex-1 rounded-[10px] border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a] transition-colors placeholder:text-[#94a3b8] focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  loading={loading}
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

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit}>
              <button
                type="button"
                onClick={() => setStep('phone')}
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

              {/* OTP Boxes */}
              <div className="mb-6 flex justify-center gap-2.5">
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
                    className="h-14 w-12 rounded-[10px] border-2 border-[#e2e8f0] bg-white text-center text-xl font-bold text-[#0f172a] transition-all focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/10"
                  />
                ))}
              </div>

              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={otp.join('').length < 6}
                className="w-full"
              >
                Verify & Login
              </Button>

              <div className="mt-4 text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-[#94a3b8]">
                    Resend OTP in <strong className="text-[#64748b]">{countdown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCountdown(45);
                    }}
                    className="text-sm font-medium text-[#1e40af] hover:underline"
                  >
                    Resend OTP
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
