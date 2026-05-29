'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@awaaz/trpc';

export const trpc = createTRPCReact<AppRouter>();
