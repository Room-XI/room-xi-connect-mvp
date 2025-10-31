console.warn('⚠️ DEPRECATED: supabase.ts is a temporary shim. Migrate to api.ts endpoints ASAP.');

export const supabase = {
  auth: {
    signUp: async () => {
      console.error('supabase.auth.signUp is deprecated. This file needs migration to Express API.');
      throw new Error('Authentication not configured. Please use /api/auth endpoints.');
    },
    getUser: async () => {
      console.error('supabase.auth.getUser is deprecated. This file needs migration to Express API.');
      return { data: { user: null }, error: new Error('Not implemented') };
    },
  },
  from: (table: string) => {
    console.error(`supabase.from('${table}') is deprecated. This file needs migration to Express API.`);
    return {
      select: () => ({ data: null, error: new Error('Not implemented') }),
      insert: () => ({ data: null, error: new Error('Not implemented') }),
      upsert: () => ({ data: null, error: new Error('Not implemented') }),
      update: () => ({ data: null, error: new Error('Not implemented') }),
      delete: () => ({ data: null, error: new Error('Not implemented') }),
    };
  },
};
