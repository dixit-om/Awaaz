import { z } from 'zod';

/** India E.164: +91 followed by 10 digits (no leading 0) */
export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+91[6-9]\d{9}$/, 'Phone must be a valid Indian number (+91XXXXXXXXXX)');

export const sendOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
