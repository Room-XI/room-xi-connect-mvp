// API client to replace Supabase client
const API_BASE = '/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

// CSRF token cache
let csrfToken: string | null = null;

/**
 * Fetch CSRF token from server
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/csrf-token`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      return csrfToken || '';
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  
  return '';
}

async function fetchApi<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    // Add CSRF token for state-changing requests
    if (options?.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
      const token = await getCsrfToken();
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers,
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      // If CSRF token is invalid, clear it and retry once
      if (response.status === 403 && data.error === 'Invalid CSRF token') {
        csrfToken = null;
        // Could retry here, but for now just return the error
      }
      return { error: data.error || data.message || 'An error occurred' };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Clear CSRF token (call on logout)
 */
export function clearCsrfToken() {
  csrfToken = null;
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
    logout: async () => {
      clearCsrfToken();
      return fetchApi('/auth/logout', {
        method: 'POST',
      });
    },
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
    create: (data: any) =>
      fetchApi('/programs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchApi(`/programs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi(`/programs/${id}`, { method: 'DELETE' }),
    getSaved: () => fetchApi('/programs/saved'),
    save: (programId: string) => fetchApi(`/programs/saved/${programId}`, { method: 'POST' }),
    unsave: (programId: string) => fetchApi(`/programs/saved/${programId}`, { method: 'DELETE' }),
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
    getLast7Days: () => fetchApi('/checkins/last-7-days'),
    getSummary: (window: number = 7) => fetchApi(`/checkins/summary?window=${window}`),
    getSummaryRange: (startDate: string, endDate: string) => 
      fetchApi(`/checkins/summary-range?startDate=${startDate}&endDate=${endDate}`),
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
    myConsents: () => fetchApi('/consent/my-consents'),
    requestGuardianVerification: (guardianContactType: string, guardianContactValue: string) =>
      fetchApi('/consent/guardian/request-verification', {
        method: 'POST',
        body: JSON.stringify({ guardianContactType, guardianContactValue }),
      }),
    verifyGuardian: (token: string, pin: string, guardianName: string) =>
      fetchApi(`/consent/guardian/verify/${token}`, {
        method: 'POST',
        body: JSON.stringify({ pin, guardianName }),
      }),
    guardianStatus: () => fetchApi('/consent/guardian/status'),
    auditTrail: () => fetchApi('/consent/audit-trail'),
    exportData: () => fetchApi('/consent/export-data'),
    deleteAccount: (confirmation: string) =>
      fetchApi('/consent/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirmation }),
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

  // Daily Quotes
  quotes: {
    getDaily: () => fetchApi('/quotes/daily'),
    getAll: () => fetchApi('/quotes/all'),
    add: (data: { quote: string; author?: string; category?: string }) =>
      fetchApi('/quotes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Notifications
  notifications: {
    getStatus: () => fetchApi('/notifications/status'),
    testNudge: () => fetchApi('/notifications/test-nudge', { method: 'POST' }),
  },

  // Push Notifications
  push: {
    getVapidPublicKey: () => fetchApi('/push/vapid-public-key'),
    subscribe: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      fetchApi('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
      }),
    unsubscribe: (endpoint?: string) =>
      fetchApi('/push/unsubscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint }),
      }),
    getStatus: () => fetchApi('/push/status'),
    send: (userId: string, payload: { title: string; body: string; url?: string; tag?: string }) =>
      fetchApi('/push/send', {
        method: 'POST',
        body: JSON.stringify({ userId, ...payload }),
      }),
    test: () => fetchApi('/push/test', { method: 'POST' }),
  },
  
  privacy: {
    getConsents: async () => {
      const response = await fetch('/api/privacy/consents', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch privacy consents');
      }
      
      return response.json();
    },
    
    updateConsents: async (data: { 
      consents: Record<string, boolean>; 
      reminderEnabled?: boolean;
    }) => {
      const response = await fetch('/api/privacy/consents', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update privacy consents');
      }
      
      return response.json();
    },
    
    getAuditLog: async () => {
      const response = await fetch('/api/privacy/audit-log', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit log');
      }
      
      return response.json();
    },
    
    recordReminderResponse: async (action: 'viewed' | 'updated' | 'dismissed') => {
      const response = await fetch('/api/privacy/reminder-response', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to record reminder response');
      }
      
      return response.json();
    },
    
    getAggregateStats: async () => {
      const response = await fetch('/api/privacy/aggregate-stats', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch aggregate stats');
      }
      
      return response.json();
    },
  },

  // Organization Dashboard
  org: {
    getDashboardStats: (timeRange: '7days' | '30days' | 'all' = '30days') =>
      fetchApi(`/org/dashboard?timeRange=${timeRange}`),
    exportReport: (timeRange: '7days' | '30days' | 'all' = '30days') =>
      fetchApi(`/org/export?timeRange=${timeRange}`),
    getProgramAnalytics: (programId: string) =>
      fetchApi(`/org/programs/${programId}/analytics`),
  },

  // Admin Dashboard
  admin: {
    getStats: () => fetchApi('/admin/stats'),
    getAuditLogs: (params?: { 
      page?: number; 
      limit?: number; 
      action?: string; 
      startDate?: string; 
      endDate?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.action) queryParams.set('action', params.action);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);
      
      const query = queryParams.toString();
      return fetchApi(`/admin/audit-logs${query ? `?${query}` : ''}`);
    },
  },
};

export default api;
