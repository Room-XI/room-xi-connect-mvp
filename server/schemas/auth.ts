import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  guardianEmail: z.string().email('Invalid guardian email').max(255).optional(),
  guardianName: z.string().max(100).optional(),
  postalCode: z.string().regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, 'Invalid Canadian postal code').optional(),
});

export const pinRegisterSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  email: z.string().email('Invalid email address').max(255).optional(),
  guardianEmail: z.string().email('Invalid guardian email').max(255).optional(),
  guardianName: z.string().max(100).optional(),
  postalCode: z.string().regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, 'Invalid Canadian postal code').optional(),
});

export const pinLoginSchema = z.object({
  loginCode: z.string().min(1, 'Login code is required').max(20).optional(),
  email: z.string().email('Invalid email').max(255).optional(),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
}).refine(data => data.loginCode || data.email, {
  message: 'Either login code or email is required',
});

export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export const deleteAccountSchema = z.object({
  confirm: z.literal('DELETE_MY_ACCOUNT', {
    errorMap: () => ({ message: 'Confirmation string must be "DELETE_MY_ACCOUNT"' }),
  }),
});

export const addGuardianSchema = z.object({
  guardianEmail: z.string().email('Invalid guardian email').max(255),
  guardianName: z.string().max(100),
  guardianRole: z.enum(['primary', 'secondary', 'emergency']).default('secondary'),
});
