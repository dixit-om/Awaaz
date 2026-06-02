import '../load-env';
import { createAuthService } from '@awaaz/auth';
import { createComplaintService } from '@awaaz/complaints';
import { createGeoService } from '@awaaz/geo';
import { getAuthConfig } from '@awaaz/config';
import { prisma } from '@awaaz/db';
import { createAppRouter } from '@awaaz/trpc';

const authService = createAuthService(prisma, getAuthConfig());
const geoService = createGeoService(prisma);

// GeoService injected into ComplaintService so complaint creation
// automatically triggers constituency resolution and authority assignment.
const complaintService = createComplaintService(prisma, geoService);

export const appRouter = createAppRouter({ authService, complaintService, geoService });
