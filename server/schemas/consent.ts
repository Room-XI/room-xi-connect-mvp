import { z } from 'zod';

export const updateConsentSchema = z.object({
  consentType: z.string().min(1).max(100),
  value: z.boolean(),
  grantedBy: z.enum(['self', 'guardian']).default('self'),
});

export const guardianVerificationRequestSchema = z.object({
  guardianContactType: z.enum(['email', 'phone']),
  guardianContactValue: z.string().min(1).max(255),
});

export const guardianVerifySchema = z.object({
  pin: z.string().length(6, 'PIN must be 6 digits'),
  guardianName: z.string().min(1).max(100),
});
