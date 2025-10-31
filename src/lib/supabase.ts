import { createClient } from '@supabase/supabase-js';

console.warn('⚠️ supabase.ts is DEPRECATED but temporarily maintained for Signup/SafetyProfile.');
console.warn('📋 TODO: Migrate Signup.tsx and SafetyProfile.tsx to Express API endpoints.');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials missing. Signup and SafetyProfile will not work.');
  console.error('This is expected - the app should use Express sessions, not Supabase auth.');
  console.error('ACTION REQUIRED: Migrate these components to /api/auth endpoints.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function isUserAdmin(userId: string): Promise<boolean> {
  console.warn('isUserAdmin from supabase.ts is deprecated. Migrate to use the new API.');
  return false;
}

export async function getCurrentUser() {
  console.warn('getCurrentUser from supabase.ts is deprecated. Use api.auth.getUser() instead.');
  return null;
}
