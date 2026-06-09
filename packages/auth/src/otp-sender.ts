import type { AuthConfig } from '@awaaz/config';
import type { OtpSender } from './auth.types.js';

export class ConsoleOtpSender implements OtpSender {
  constructor(private readonly config: AuthConfig) {}

  async send(phoneNumber: string, otp: string): Promise<void> {
    if (this.config.OTP_DEV_MODE) {
      console.log(`[AWAAZ OTP] ${phoneNumber} → ${otp}`);
      return;
    }
    // Phase 1.5: integrate MSG91 / Twilio
    throw new Error('OTP delivery is not configured. Enable OTP_DEV_MODE for local development.');
  }
}
