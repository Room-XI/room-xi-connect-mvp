import { z } from 'zod';

// ============================================================================
// YOUTH PROFILES
// ============================================================================

export const youthProfileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100),
  legal_first_name: z.string().min(1, 'First name is required').max(100).optional(),
  legal_last_name: z.string().min(1, 'Last name is required').max(100).optional(),
  age: z.number().int().min(13, 'Must be 13 or older').max(25, 'Must be 25 or younger'),
  pronouns: z.enum(['he/him', 'she/her', 'they/them', 'other', 'prefer_not_to_say']).optional(),
  phone: z.string().regex(/^\+?1?\d{10}$/, 'Invalid phone number').optional(),
  email: z.string().email('Invalid email address').optional(),
  
  // Guardian info (required for minors)
  guardian_name: z.string().max(200).optional(),
  guardian_email: z.string().email('Invalid guardian email').optional(),
  guardian_phone: z.string().regex(/^\+?1?\d{10}$/, 'Invalid guardian phone').optional(),
  guardian_relationship: z.enum(['parent', 'legal_guardian', 'foster_parent', 'other']).optional(),
  
  // Emergency contact
  emergency_contact_name: z.string().max(200).optional(),
  emergency_contact_phone: z.string().regex(/^\+?1?\d{10}$/, 'Invalid emergency contact phone').optional(),
  emergency_contact_relationship: z.string().max(100).optional(),
  
  // Indigenous identity
  indigenous_identity: z.enum(['first_nations', 'metis', 'inuit', 'prefer_not_to_say']).optional(),
  indigenous_community: z.string().max(200).optional(),
  
  // Consent
  consent_default_share: z.boolean().default(false)
});

export type YouthProfile = z.infer<typeof youthProfileSchema>;

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200),
  type: z.enum(['nonprofit', 'school', 'government', 'healthcare']),
  contact_email: z.string().email('Invalid email address').optional(),
  contact_phone: z.string().regex(/^\+?1?\d{10}$/, 'Invalid phone number').optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postal_code: z.string().optional()
  }).optional(),
  website: z.string().url('Invalid website URL').optional()
});

export type Organization = z.infer<typeof organizationSchema>;

// ============================================================================
// REFERRALS
// ============================================================================

export const referralSchema = z.object({
  from_org_id: z.string().uuid('Invalid organization ID'),
  to_org_id: z.string().uuid('Invalid organization ID'),
  youth_id: z.string().uuid('Invalid youth ID'),
  summary: z.string().max(500, 'Summary too long (max 500 characters)').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
});

export type Referral = z.infer<typeof referralSchema>;

// ============================================================================
// CASE NOTES
// ============================================================================

export const caseNoteSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  youth_id: z.string().uuid('Invalid youth ID'),
  note: z.string().min(1, 'Note cannot be empty').max(5000, 'Note too long (max 5000 characters)'),
  category: z.enum(['intake', 'session', 'incident', 'progress', 'other']).default('session'),
  tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags').default([])
});

export type CaseNote = z.infer<typeof caseNoteSchema>;

// ============================================================================
// JOURNAL ENTRIES
// ============================================================================

export const journalEntrySchema = z.object({
  mood: z.number().int().min(1).max(5),
  content: z.string().min(1, 'Entry cannot be empty').max(5000, 'Entry too long (max 5000 characters)'),
  prompt: z.string().max(500).optional(),
  ximi_conversation: z.boolean().default(false)
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;

// ============================================================================
// PROGRAMS
// ============================================================================

export const programSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Program name is required').max(200),
  description: z.string().max(2000, 'Description too long').optional(),
  category: z.enum(['mental_health', 'education', 'recreation', 'employment', 'housing', 'other']),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags').default([]),
  location: z.object({
    address: z.string().max(500),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  schedule: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    recurring: z.boolean().default(false),
    days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    time_start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
    time_end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional()
  }).optional(),
  eligibility: z.object({
    min_age: z.number().int().min(0).max(100).optional(),
    max_age: z.number().int().min(0).max(100).optional(),
    capacity: z.number().int().min(1).optional(),
    requirements: z.array(z.string()).optional()
  }).optional(),
  contact: z.object({
    name: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(/^\+?1?\d{10}$/).optional()
  }).optional(),
  accessibility_notes: z.string().max(1000).optional(),
  active: z.boolean().default(true)
});

export type Program = z.infer<typeof programSchema>;

// ============================================================================
// CONSENTS
// ============================================================================

export const consentRequestSchema = z.object({
  youth_id: z.string().uuid('Invalid youth ID'),
  grantee_org_id: z.string().uuid('Invalid organization ID'),
  scope: z.enum([
    'share_intake',
    'referral',
    'case_notes',
    'updates',
    'photo_internal',
    'photo_social_media',
    'analytics_opt_in',
    'ai_personalization'
  ])
});

export type ConsentRequest = z.infer<typeof consentRequestSchema>;

export const consentVerificationSchema = z.object({
  token: z.string().uuid('Invalid verification token'),
  action: z.enum(['grant', 'deny']),
  guardian_dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
});

export type ConsentVerification = z.infer<typeof consentVerificationSchema>;

// ============================================================================
// MOOD CHECK-INS
// ============================================================================

export const moodCheckInSchema = z.object({
  mood: z.number().int().min(1).max(5),
  affect_tags: z.array(z.string().max(50)).max(10).default([]),
  notes: z.string().max(500).optional(),
  location: z.enum(['home', 'school', 'program', 'other']).optional(),
  triggers: z.array(z.string().max(50)).max(5).optional()
});

export type MoodCheckIn = z.infer<typeof moodCheckInSchema>;

// ============================================================================
// COPING SKILLS
// ============================================================================

export const copingSkillSchema = z.object({
  category: z.enum(['anxiety', 'stress', 'sleep', 'anger', 'sadness', 'overwhelm', 'general']),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(z.string().max(500)).min(1, 'At least one step is required'),
  duration_minutes: z.number().int().min(1).max(120),
  difficulty: z.enum(['easy', 'moderate', 'advanced']),
  tags: z.array(z.string().max(50)).max(10).default([]),
  culturally_adapted: z.boolean().default(false),
  cultural_notes: z.string().max(1000).optional()
});

export type CopingSkill = z.infer<typeof copingSkillSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}

/**
 * Validate phone number (North American format)
 */
export function isValidPhone(phone: string): boolean {
  return /^\+?1?\d{10}$/.test(phone);
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid: string): boolean {
  return z.string().uuid().safeParse(uuid).success;
}

/**
 * Validate age (13-25 for youth)
 */
export function isValidYouthAge(age: number): boolean {
  return age >= 13 && age <= 25;
}

/**
 * Check if user is a minor (under 18)
 */
export function isMinor(age: number): boolean {
  return age < 18;
}

/**
 * Validate date of birth and calculate age
 */
export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Validate and format phone number
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+${cleaned}`;
  }
  return phone;
}

/**
 * Validate postal code (Canadian format)
 */
export function isValidPostalCode(postalCode: string): boolean {
  return /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i.test(postalCode);
}

/**
 * Format postal code (Canadian format)
 */
export function formatPostalCode(postalCode: string): string {
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return postalCode;
}

