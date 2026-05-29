import '../load-env';
import { createAuthService } from '@awaaz/auth';
import { getAuthConfig } from '@awaaz/config';
import { prisma } from '@awaaz/db';
import { createAppRouter } from '@awaaz/trpc';

const authService = createAuthService(prisma, getAuthConfig());

export const appRouter = createAppRouter(authService);
