import { z } from 'zod';

export const authConfigSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  OTP_PEPPER: z.string().min(16).optional(),
  OTP_EXPIRY_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_SEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(604_800),
  OTP_DEV_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;

export function getAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  const pepper = env.OTP_PEPPER ?? env.JWT_REFRESH_SECRET;
  const result = authConfigSchema.safeParse({
    ...env,
    OTP_PEPPER: pepper,
  });

  if (!result.success) {
    console.error('❌ Invalid auth configuration:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid auth configuration');
  }

  return result.data;
}
