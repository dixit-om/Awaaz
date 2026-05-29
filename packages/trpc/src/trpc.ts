import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

/**
 * Base tRPC instance — context type is augmented in apps/server.
 * Feature routers merge into root router here.
 */
const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
