import '../load-env';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { getAuthConfig } from '@awaaz/config';
import { prisma } from '@awaaz/db';
import type { TRPCContext } from '@awaaz/trpc/context';
import { AuthRepository, verifyAccessToken } from '@awaaz/auth';

const authConfig = getAuthConfig();
const authRepo = new AuthRepository(prisma);

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<TRPCContext> {
  let user: TRPCContext['user'] = null;

  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    try {
      const payload = await verifyAccessToken(authConfig, token);
      user = await authRepo.findUserById(payload.sub);
    } catch {
      user = null;
    }
  }

  return {
    prisma,
    req,
    res,
    user,
  };
}
