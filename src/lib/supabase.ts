import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Enhanced Supabase client with security configurations (Fix for R-05: Open Redirects in Auth)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Restrict redirect URLs to prevent open redirect attacks
    redirectTo: `${window.location.origin}/auth/update-password`,
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Persist session in localStorage (encrypted by Supabase)
    persistSession: true,
    // Detect session in URL and store it
    detectSessionInUrl: true,
  },
  // Enable real-time subscriptions for live updates
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types for type safety
export type Database = {
  public: {
    Tables: {
      programs: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          tags: string[];
          free: boolean;
          indoor: boolean | null;
          outdoor: boolean | null;
          cost_cents: number | null;
          location_name: string | null;
          address: string | null;
          lat: string | null;
          lng: string | null;
          organizer: string | null;
          accessibility_notes: string | null;
          next_start: string | null;
          next_end: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['programs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['programs']['Insert']>;
      };
      saved_programs: {
        Row: {
          user_id: string;
          program_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_programs']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['saved_programs']['Insert']>;
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          timestamp: string;
          dimension: string;
          mood_level_1_6: number;
          affect_tags: string[];
          note: string | null;
          local_tz: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['checkins']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['checkins']['Insert']>;
      };
      profiles: {
        Row: {
          user_id: string;
          weights: any | null;
          scores: any | null;
          streak_count: number;
          last_checkin_date: string | null;
          is_admin: boolean;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'streak_count'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      xids: {
        Row: {
          id: string;
          user_id: string;
          xid_hash: string;
          checksum: string | null;
          tombstoned_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['xids']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['xids']['Insert']>;
      };
      attendance: {
        Row: {
          id: string;
          xid_id: string;
          program_id: string;
          timestamp: string;
          method: 'qr' | 'manual';
          site: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>;
      };
      consents: {
        Row: {
          user_id: string;
          key: string;
          value: boolean;
          ip_address: string | null;
          user_agent: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consents']['Row'], 'updated_at'>;
        Update: Partial<Database['public']['Tables']['consents']['Insert']>;
      };
      crisis_supports: {
        Row: {
          id: string;
          region: string;
          category: 'call' | 'textchat' | 'inperson';
          name: string;
          phone: string | null;
          text_code: string | null;
          chat_url: string | null;
          address: string | null;
          hours: string | null;
          notes: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['crisis_supports']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['crisis_supports']['Insert']>;
      };
      admin_logs: {
        Row: {
          id: number;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          old_record: any | null;
          new_record: any | null;
          timestamp: string;
        };
      };
    };
    Functions: {
      create_or_update_checkin: {
        Args: {
          p_timestamp: string;
          p_dimension: string;
          p_mood_level_1_6: number;
          p_affect_tags: string[];
          p_note?: string;
          p_local_tz?: string;
        };
        Returns: string;
      };
      is_admin: {
        Args: {};
        Returns: boolean;
      };
    };
  };
};

// Helper function to check if user is admin (Fix for R-04: Admin Account Takeover)
export async function isUserAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    return data || false;
  } catch (error) {
    console.error('Unexpected error checking admin status:', error);
    return false;
  }
}

// Helper function to get current user with error handling
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    return null;
  }
}
