import '../load-env';
import { createAuthService } from '@awaaz/auth';
import { createComplaintService } from '@awaaz/complaints';
import { getAuthConfig } from '@awaaz/config';
import { prisma } from '@awaaz/db';
import { createAppRouter } from '@awaaz/trpc';

const authService = createAuthService(prisma, getAuthConfig());
const complaintService = createComplaintService(prisma);

export const appRouter = createAppRouter({ authService, complaintService });
