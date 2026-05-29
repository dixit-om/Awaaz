import type { AuthService } from '@awaaz/auth';
import {
  logoutSchema,
  refreshTokenSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '@awaaz/validation';
import { publicProcedure, protectedProcedure, router } from '../server';

export function createAuthRouter(authService: AuthService) {
  return router({
    sendOTP: publicProcedure.input(sendOtpSchema).mutation(({ input }) => {
      return authService.sendOtp(input);
    }),

    verifyOTP: publicProcedure.input(verifyOtpSchema).mutation(({ input }) => {
      return authService.verifyOtp(input);
    }),

    refreshToken: publicProcedure.input(refreshTokenSchema).mutation(({ input }) => {
      return authService.refreshTokens(input);
    }),

    logout: protectedProcedure.input(logoutSchema).mutation(({ ctx, input }) => {
      return authService.logout(ctx.user.id, input);
    }),

    getCurrentUser: protectedProcedure.query(({ ctx }) => {
      return authService.getCurrentUser(ctx.user.id);
    }),
  });
}
