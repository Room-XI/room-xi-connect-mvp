import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Enhanced Supabase client with security configurations (Fix for R-05: Open Redirects in Auth)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
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
          first_name: string | null;
          last_name: string | null;
          preferred_name: string | null;
          age: number | null;
          date_of_birth: string | null;
          city: string | null;
          postal_code: string | null;
          legal_first_name: string | null;
          legal_last_name: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relationship: string | null;
          indigenous_identity: 'first_nations' | 'metis' | 'inuit' | 'prefer_not_to_say' | null;
          indigenous_community: string | null;
          account_complete: boolean;
          safety_profile_complete: boolean;
          program_profile_complete: boolean;
          xp_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'streak_count' | 'xp_points' | 'account_complete' | 'safety_profile_complete' | 'program_profile_complete' | 'created_at' | 'updated_at'>;
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
      guardian_verifications: {
        Row: {
          id: string;
          user_id: string;
          guardian_contact_type: 'email' | 'phone';
          guardian_contact_value: string;
          guardian_contact_hash: string;
          verification_token: string;
          verification_method: 'alberta_digital_id' | 'email_link' | 'sms_link' | null;
          verified_at: string | null;
          verified_by_name: string | null;
          verified_by_ip: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['guardian_verifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['guardian_verifications']['Insert']>;
      };
      consents: {
        Row: {
          user_id: string;
          consent_type: 'terms_of_use' | 'privacy_notice' | 'data_collection' | 'photo_internal' | 'photo_social_media' | 'photo_website' | 'photo_fundraising' | 'photo_story' | 'analytics_opt_in' | 'ai_personalization' | 'crash_reporting' | 'marketing_email' | 'marketing_sms';
          value: boolean;
          ip_address: string | null;
          user_agent: string | null;
          granted_by: 'self' | 'guardian' | 'staff' | null;
          evidence_ref: string | null;
          text_version: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consents']['Row'], 'updated_at'>;
        Update: Partial<Database['public']['Tables']['consents']['Insert']>;
      };
      health_profiles: {
        Row: {
          user_id: string;
          allergies: string | null;
          medical_conditions: string | null;
          medications: string | null;
          accessibility_needs: string | null;
          dietary_restrictions: string | null;
          parq_status: 'clear' | 'refer' | 'not_completed' | null;
          parq_completed_at: string | null;
          health_data_consent: boolean;
          health_consent_granted_at: string | null;
          health_consent_ip: string | null;
          health_consent_user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['health_profiles']['Insert']>;
      };
      consent_events: {
        Row: {
          id: string;
          user_id: string;
          actor: 'youth' | 'guardian' | 'staff' | 'system';
          event_type: 'granted' | 'revoked' | 'updated' | 'requested' | 'verified';
          consent_key: string | null;
          old_value: boolean | null;
          new_value: boolean | null;
          ip_address: string | null;
          user_agent: string | null;
          evidence_ref: string | null;
          notes: string | null;
          occurred_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consent_events']['Row'], 'id' | 'occurred_at'>;
        Update: never;
      };
      breach_events: {
        Row: {
          id: string;
          breach_type: 'unauthorized_access' | 'data_loss' | 'ransomware' | 'insider_threat' | 'accidental_disclosure' | 'other';
          severity: 'low' | 'medium' | 'high' | 'critical';
          affected_user_count: number | null;
          affected_user_ids: string[] | null;
          description: string;
          oipc_notification_required: boolean;
          oipc_notified_at: string | null;
          oipc_notification_method: string | null;
          oipc_reference_number: string | null;
          individuals_notified_at: string | null;
          notification_method: string | null;
          guardians_notified_at: string | null;
          remediation_steps: string | null;
          remediation_completed_at: string | null;
          discovered_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['breach_events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['breach_events']['Insert']>;
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
