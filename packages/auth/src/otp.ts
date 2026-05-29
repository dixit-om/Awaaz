import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(otp: string, phoneNumber: string, pepper: string): string {
  return createHash('sha256').update(`${otp}:${phoneNumber}:${pepper}`).digest('hex');
}

export function verifyOtpHash(
  otp: string,
  phoneNumber: string,
  pepper: string,
  otpHash: string,
): boolean {
  const computed = hashOtp(otp, phoneNumber, pepper);
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(otpHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
