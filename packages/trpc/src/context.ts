import type { PrismaClient } from '@awaaz/db';
import type { AuthUser } from '@awaaz/types';

export type TRPCContext = {
  prisma: PrismaClient;
  req: unknown;
  res: unknown;
  user: AuthUser | null;
};
