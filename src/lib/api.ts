// API client to replace Supabase client
import { API_BASE as configApiBase } from './config';

const API_BASE = configApiBase.endsWith('/api') ? configApiBase : `${configApiBase}/api`;

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

export interface ProgramRecommendation {
  eventId: string;
  programId: string;
  eventName: string;
  programTitle: string;
  title: string;
  description: string | null;
  programDescription: string | null;
  matchScore: number;
  triggerReason: string;
  tags: string[];
  wellnessDimensions: string[];
  free: boolean;
  costCents: number | null;
  cost: string;
  ageMin: number | null;
  ageMax: number | null;
  locationName: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  website: string | null;
  accessibilityNotes: string | null;
  dayOfWeek: string | null;
  startTime: string;
  endTime: string;
  nextStart: Date | null;
  isDropIn: boolean;
  requiresRegistration: boolean;
  registrationUrl: string | null;
  distance: number | null;
  organizer: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface MoodTrendData {
  userId: string;
  windowType: 'week' | 'month' | 'quarter';
  windowStart: string;
  windowEnd: string;
  averageMoodLevel: number;
  moodVariance: number;
  dominantMood: string | null;
  trendDirection: 'improving' | 'declining' | 'stable' | 'volatile';
  consecutiveLowDays: number;
  consecutiveHighDays: number;
  patternsDetected: string[];
  topWellnessConcerns: string[];
  wellnessScores: Record<string, number>;
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
  options?: RequestInit,
  isRetry: boolean = false
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
      // Handle invalid CSRF token with retry
      if (response.status === 403 && data.error === 'Invalid CSRF token' && !isRetry) {
        csrfToken = null;
        // Retry once with fresh token
        return fetchApi<T>(endpoint, options, true);
      }
      
      console.error(`API ${options?.method || 'GET'} ${endpoint} failed:`, response.status, data.error || data.message);
      
      return { error: data.error || data.message || 'An error occurred' };
    }

    return { data };
  } catch (error) {
    console.error(`API ${options?.method || 'GET'} ${endpoint} exception:`, error);
    
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

  // Program Occurrences (individual events from programEvents table)
  programOccurrences: {
    list: (userLat?: number, userLng?: number) => {
      const params = new URLSearchParams();
      if (userLat !== undefined) params.append('userLat', userLat.toString());
      if (userLng !== undefined) params.append('userLng', userLng.toString());
      const queryString = params.toString();
      return fetchApi(`/events/program-occurrences${queryString ? `?${queryString}` : ''}`);
    },
    grouped: (userLat?: number, userLng?: number) => {
      const params = new URLSearchParams();
      if (userLat !== undefined) params.append('userLat', userLat.toString());
      if (userLng !== undefined) params.append('userLng', userLng.toString());
      const queryString = params.toString();
      return fetchApi(`/events/programs-grouped${queryString ? `?${queryString}` : ''}`);
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
    withdraw: (youthUserId?: string) =>
      fetchApi('/consent/withdraw', {
        method: 'POST',
        body: JSON.stringify({ youthUserId }),
      }),
    matureMinor: {
      getStatus: () => fetchApi('/consent/mature-minor/status'),
      getQuestions: () => fetchApi('/consent/mature-minor/questions'),
      submit: (responses: Record<string, { answer: string; explanation?: string }>) =>
        fetchApi('/consent/mature-minor/submit', {
          method: 'POST',
          body: JSON.stringify({ responses }),
        }),
    },
  },

  // Crisis supports
  crisis: {
    list: () => fetchApi('/crisis'),
    getResources: () => fetchApi('/crisis'),
  },

  // Ximi AI
  ximi: {
    getConversations: (limit: number = 20, offset: number = 0) => 
      fetchApi<{ 
        conversations: any[]; 
        pagination: { total: number; limit: number; offset: number; hasMore: boolean } 
      }>(`/ximi/conversations?limit=${limit}&offset=${offset}`),
    chat: async (data: { message: string; checkinId?: string; moodType?: string; wellnessDimensions?: string[] }) => {
      return await fetchApi('/ximi/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    getFollowUp: (checkinId: string) =>
      fetchApi('/ximi/follow-up', {
        method: 'POST',
        body: JSON.stringify({ checkinId }),
      }),
    setConsent: (consent: boolean) =>
      fetchApi('/ximi/consent', {
        method: 'POST',
        body: JSON.stringify({ consent }),
      }),
    getTrends: (windowType: 'week' | 'month' | 'quarter' = 'week') =>
      fetchApi<MoodTrendData>(`/ximi/trends?windowType=${windowType}`),
    getRecommendations: (data?: { 
      currentMood?: string; 
      wellnessDimensions?: string[]; 
      includeTrends?: boolean;
      userLat?: number;
      userLng?: number;
      prioritizeNearby?: boolean;
    }) =>
      fetchApi<{ recommendations: ProgramRecommendation[]; trendContext: MoodTrendData | null; count: number }>('/ximi/recommendations', {
        method: 'POST',
        body: JSON.stringify(data || {}),
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

    getYouthSettings: () => fetchApi('/privacy/youth-settings'),
    
    updateYouthSettings: (data: {
      parentCanSeeMood?: boolean;
      parentCanSeeDemographics?: boolean;
      parentCanSeeAttendance?: boolean;
      parentCanSeeXimiChats?: boolean;
      hiddenProgramIds?: string[];
    }) => fetchApi('/privacy/youth-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
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
    login: (username: string, password: string) =>
      fetchApi('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () =>
      fetchApi('/admin/logout', {
        method: 'POST',
      }),
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

  // Events - Real-time program event finder
  events: {
    happeningNow: (userLat?: number, userLng?: number) => {
      const params = new URLSearchParams();
      if (userLat !== undefined) params.set('userLat', userLat.toString());
      if (userLng !== undefined) params.set('userLng', userLng.toString());
      const query = params.toString();
      return fetchApi(`/events/happening-now${query ? `?${query}` : ''}`);
    },
    today: (userLat?: number, userLng?: number) => {
      const params = new URLSearchParams();
      if (userLat !== undefined) params.set('userLat', userLat.toString());
      if (userLng !== undefined) params.set('userLng', userLng.toString());
      const query = params.toString();
      return fetchApi(`/events/today${query ? `?${query}` : ''}`);
    },
    thisWeekend: (userLat?: number, userLng?: number) => {
      const params = new URLSearchParams();
      if (userLat !== undefined) params.set('userLat', userLat.toString());
      if (userLng !== undefined) params.set('userLng', userLng.toString());
      const query = params.toString();
      return fetchApi(`/events/this-weekend${query ? `?${query}` : ''}`);
    },
    later: (userLat?: number, userLng?: number) => {
      const params = new URLSearchParams();
      if (userLat !== undefined) params.set('userLat', userLat.toString());
      if (userLng !== undefined) params.set('userLng', userLng.toString());
      const query = params.toString();
      return fetchApi(`/events/later${query ? `?${query}` : ''}`);
    },
  },

  // Parent Auth
  parentAuth: {
    sendInvite: (email: string) =>
      fetchApi('/parent-auth/invite', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    getPendingInvites: () => fetchApi('/parent-auth/invites/pending'),
    getStatus: () => fetchApi('/parent-auth/status'),
    logout: () =>
      fetchApi('/parent-auth/logout', {
        method: 'POST',
      }),
  },

  // Parent Portal (filtered youth data based on privacy settings)
  parentPortal: {
    getYouthData: (youthId?: string) => 
      youthId 
        ? fetchApi(`/parent-portal/youth-data/${youthId}`)
        : fetchApi('/parent-portal/youth-data'),
    getPrivacySummary: (youthId: string) =>
      fetchApi(`/parent-portal/privacy-summary/${youthId}`),
  },

  // Consent Auto
  consentAuto: {
    bootstrapPlatform: () =>
      fetchApi('/consent-auto/platform-bootstrap', {
        method: 'POST',
      }),
    requestProgramConsent: (programId: string) =>
      fetchApi('/consent-auto/program-request', {
        method: 'POST',
        body: JSON.stringify({ programId }),
      }),
    getPending: (userId: string) => fetchApi(`/consent-auto/pending/${userId}`),
    approve: (userId: string, consentType: string, value: boolean) =>
      fetchApi('/consent-auto/approve', {
        method: 'POST',
        body: JSON.stringify({ userId, consentType, value }),
      }),
  },

  // Demographics
  demographics: {
    saveYouth: (answers: Record<string, any>) =>
      fetchApi('/demographics/youth', {
        method: 'POST',
        body: JSON.stringify(answers),
      }),
    getYouth: () => fetchApi('/demographics/youth'),
    saveParent: (userId: string, answers: Record<string, any>) =>
      fetchApi('/demographics/parent', {
        method: 'POST',
        body: JSON.stringify({ userId, answers }),
      }),
    getParent: (userId: string) => fetchApi(`/demographics/parent/${userId}`),
    getProgress: () => fetchApi<{
      percent: number;
      completed: number;
      total: number;
      requiredFields: string[];
      completedFields: string[];
      missingFields: string[];
    }>('/demographics/progress'),
  },

  // Disclosure requests (parent access to youth demographics)
  disclosure: {
    request: (youthId: string, reason?: string) =>
      fetchApi('/disclosure/request', {
        method: 'POST',
        body: JSON.stringify({ youthId, reason }),
      }),
    getPending: () => fetchApi('/disclosure/pending'),
    respond: (requestId: string, decision: 'approved' | 'denied') =>
      fetchApi('/disclosure/respond', {
        method: 'POST',
        body: JSON.stringify({ requestId, decision }),
      }),
    checkAccess: (youthId: string) => fetchApi(`/disclosure/access/${youthId}`),
    getHistory: () => fetchApi('/disclosure/history'),
  },

  // Mood Tasks
  moodTasks: {
    getAll: () => fetchApi('/mood-tasks/'),
    getDue: () => fetchApi('/mood-tasks/due'),
    complete: (taskId: string) =>
      fetchApi(`/mood-tasks/${taskId}/complete`, {
        method: 'POST',
      }),
    create: (userId: string, programEventId: string, type: 'pre' | 'post', dueAt: string) =>
      fetchApi('/mood-tasks/create', {
        method: 'POST',
        body: JSON.stringify({ userId, programEventId, type, dueAt }),
      }),
  },

  // QR Badge
  qr: {
    rotateToken: () =>
      fetchApi('/qr/badge/rotate', {
        method: 'POST',
      }),
    scan: (token: string, programEventId: string, eventEndIso?: string) =>
      fetchApi('/qr/scan', {
        method: 'POST',
        body: JSON.stringify({ token, programEventId, eventEndIso }),
      }),
    validate: (token: string) => fetchApi(`/qr/validate/${token}`),
  },
};

export { fetchApi };
export default api;
