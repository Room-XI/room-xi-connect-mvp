// API client to replace Supabase client
const API_BASE = '/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

async function fetchApi<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'An error occurred' };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export const api = {
  // Auth
  auth: {
    register: (email: string, password: string, profile?: any) =>
      fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, ...profile }),
      }),
    login: (email: string, password: string) =>
      fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      fetchApi('/auth/logout', {
        method: 'POST',
      }),
    getUser: () => fetchApi('/auth/me'),
    resetPassword: (email: string) =>
      fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    updatePassword: (newPassword: string) =>
      fetchApi('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }),
    deleteAccount: (confirm: string) =>
      fetchApi('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirm }),
      }),
  },

  // Programs
  programs: {
    list: () => fetchApi('/programs'),
    get: (id: string) => fetchApi(`/programs/${id}`),
    saved: {
      list: () => fetchApi('/programs/saved/list'),
      add: (programId: string) =>
        fetchApi(`/programs/saved/${programId}`, { method: 'POST' }),
      remove: (programId: string) =>
        fetchApi(`/programs/saved/${programId}`, { method: 'DELETE' }),
    },
  },

  // Check-ins
  checkins: {
    list: () => fetchApi('/checkins'),
    create: (data: {
      timestamp?: string;
      dimension?: string;
      moodLevel16?: number;
      moodType?: string; // New 6-level mood system (cold, stormy, foggy, clear, breezy, aurora)
      wellnessDimensions?: string[]; // SAMHSA wellness dimensions (emotional, physical, social, etc.)
      affectTags?: string[];
      note?: string;
      localTz?: string;
    }) =>
      fetchApi('/checkins', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Profile
  profile: {
    get: () => fetchApi('/profile'),
    update: (data: any) =>
      fetchApi('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // XID
  xid: {
    create: () =>
      fetchApi('/xid/create', {
        method: 'POST',
      }),
    recordAttendance: (programId: string, method = 'manual', site?: string) =>
      fetchApi('/xid/attendance', {
        method: 'POST',
        body: JSON.stringify({ programId, method, site }),
      }),
    getAttendance: () => fetchApi('/xid/attendance'),
  },

  // Consent
  consent: {
    list: () => fetchApi('/consent'),
    update: (consentType: string, value: boolean, grantedBy = 'self') =>
      fetchApi('/consent', {
        method: 'POST',
        body: JSON.stringify({ consentType, value, grantedBy }),
      }),
  },

  // Crisis supports
  crisis: {
    list: () => fetchApi('/crisis'),
    getResources: () => fetchApi('/crisis'),
  },

  // Ximi AI
  ximi: {
    getConversations: () => fetchApi('/ximi/conversations'),
    chat: (data: { message: string; checkinId?: string; moodType?: string; wellnessDimensions?: string[] }) =>
      fetchApi('/ximi/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getFollowUp: (checkinId: string) =>
      fetchApi('/ximi/follow-up', {
        method: 'POST',
        body: JSON.stringify({ checkinId }),
      }),
    toggleMode: (mode: 'sibling' | 'peer') =>
      fetchApi('/ximi/toggle-mode', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      }),
    setConsent: (consent: boolean) =>
      fetchApi('/ximi/consent', {
        method: 'POST',
        body: JSON.stringify({ consent }),
      }),
  },
};

export default api;
