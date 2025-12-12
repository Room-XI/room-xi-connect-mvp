import { z } from 'zod';

const canadianPostalCodeRegex = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  postalCode: z.string()
    .regex(canadianPostalCodeRegex, 'Please enter a valid Canadian postal code (e.g., T5X 1Y2)')
    .transform(val => val.toUpperCase().replace(/\s+/g, '').replace(/^(.{3})(.{3})$/, '$1 $2')),
  guardianEmail: z.string().email('Invalid guardian email').max(255).optional(),
  guardianName: z.string().max(100).optional(),
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
