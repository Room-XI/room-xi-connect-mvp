// This file is deprecated and replaced by src/lib/api.ts
// Keeping this file to prevent import errors during migration
// All Supabase functionality has been migrated to a custom Express API

console.warn('supabase.ts is deprecated. Please use api.ts instead.');

// Create a dummy supabase object to prevent import errors
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ error: null }),
  }),
  rpc: () => Promise.resolve({ data: null, error: null }),
};

export async function isUserAdmin(): Promise<boolean> {
  console.warn('isUserAdmin from supabase.ts is deprecated. Migrate to use the new API.');
  return false;
}

export async function getCurrentUser() {
  console.warn('getCurrentUser from supabase.ts is deprecated. Use api.auth.getUser() instead.');
  return null;
}

export type Database = any;

export default supabase;
