import { z } from 'zod';

/**
 * Server-side environment variables.
 * Validated at startup — fail fast if misconfigured.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SERVER_PORT: z.coerce.number().int().positive().default(4000),
  SERVER_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
});

/**
 * Client-safe environment variables (NEXT_PUBLIC_*).
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return result.data;
}

/** Parse and validate server environment from process.env */
export function getServerEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  return parseEnv(serverEnvSchema, env);
}

/** Parse and validate client environment (NEXT_PUBLIC_* only) */
export function getClientEnv(env: Record<string, string | undefined> = process.env): ClientEnv {
  return parseEnv(clientEnvSchema, env);
}

export { serverEnvSchema, clientEnvSchema };
