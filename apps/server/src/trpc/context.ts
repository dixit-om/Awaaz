import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma } from '@awaaz/db';

/**
 * Request context passed to every tRPC procedure.
 * Extend with session/user when auth module is implemented.
 */
export async function createContext({ req, res }: CreateExpressContextOptions) {
  return {
    req,
    res,
    prisma,
    // user: null, // auth phase
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
