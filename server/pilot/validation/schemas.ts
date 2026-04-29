/**
 * Pilot request-body validation schemas (Zod).
 *
 * Canonical place for all pilot input validation. Per SOT §04 & §08:
 * - youth PIN: exactly 6 digits for all pilot surfaces (signup AND login)
 * - youth email optional
 * - under-16 guardian email required at signup
 * - parent magic-link request: email only
 */

import { z } from 'zod';

export const PinSchema = z.string().regex(/^\d{6}$/, 'PIN must be 6 digits');
export const EmailSchema = z.string().email().max(255);
export const DisplayNameSchema = z.string().min(1).max(50);
export const DOBSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD');
export const GuardianNameSchema = z.string().max(100);
export const PostalCodeSchema = z
  .string()
  .regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, 'Invalid Canadian postal code');
export const LoginCodeSchema = z.string().min(1).max(20);

export const PilotYouthRegisterSchema = z.object({
  displayName: DisplayNameSchema,
  dateOfBirth: DOBSchema,
  pin: PinSchema,
  email: EmailSchema.optional(),
  guardianEmail: EmailSchema.optional(),
  guardianName: GuardianNameSchema.optional(),
  guardianPhone: z.string().max(32).optional(),
  postalCode: PostalCodeSchema.optional(),
});

export const PilotYouthLoginSchema = z
  .object({
    loginCode: LoginCodeSchema.optional(),
    email: EmailSchema.optional(),
    pin: PinSchema,
  })
  .refine((data) => !!(data.loginCode || data.email), {
    message: 'Provide either login code or email',
  });

export const PilotParentMagicLinkRequestSchema = z.object({
  email: EmailSchema,
});

export const PilotParentPasswordLoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

export type PilotYouthRegisterInput = z.infer<typeof PilotYouthRegisterSchema>;
export type PilotYouthLoginInput = z.infer<typeof PilotYouthLoginSchema>;
export type PilotParentMagicLinkRequestInput = z.infer<
  typeof PilotParentMagicLinkRequestSchema
>;
export type PilotParentPasswordLoginInput = z.infer<
  typeof PilotParentPasswordLoginSchema
>;
