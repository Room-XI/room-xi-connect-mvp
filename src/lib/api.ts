// API client to replace Supabase client
import { API_BASE as configApiBase } from './config';
import { getFriendlyErrorMessage } from './errors';

const API_BASE = configApiBase.endsWith('/api') ? configApiBase : `${configApiBase}/api`;

interface ValidationIssue {
  path: string;
  message: string;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  friendlyError?: string;
  message?: string;
  issues?: ValidationIssue[];
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

export type XimiChatResultType = 'program_results' | 'schedule_results' | 'suggestions' | 'redirect' | 'crisis';

export interface XimiChatResponse {
  id: string;
  userId: string;
  userMessage: string;
  ximiResponse: string;
  crisisDetected: boolean;
  resultType: XimiChatResultType;
  trendContext: MoodTrendData | null;
  recommendationsIncluded: boolean;
  createdAt: string;
  [key: string]: any;
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

// CSRF token cache per namespace (user, parent, admin have separate sessions)
type CsrfNamespace = 'user' | 'parent' | 'admin' | 'org' | 'worker';
const csrfTokens: Record<CsrfNamespace, string | null> = {
  user: null,
  parent: null,
  admin: null,
  org: null,
  worker: null,
};

// CSRF token endpoint paths per namespace.
// Pilot cutover (T010): user + parent CSRF now sourced from the canonical
// pilot auth surface. Admin/org/worker portals keep their dedicated paths.
const csrfEndpoints: Record<CsrfNamespace, string> = {
  user: '/pilot/auth/youth/csrf',
  parent: '/pilot/auth/parent/csrf',
  admin: '/admin/csrf-token',
  org: '/org/csrf-token',
  worker: '/youth-workers/csrf-token',
};

/**
 * Determine the namespace for a given API endpoint
 */
function getNamespaceForEndpoint(endpoint: string): CsrfNamespace {
  if (endpoint.startsWith('/admin/') || endpoint.startsWith('/admin')) {
    return 'admin';
  }
  if (
    endpoint.startsWith('/parent-auth/') ||
    endpoint.startsWith('/parent-portal/') ||
    endpoint.startsWith('/consent-wallet/') ||
    endpoint.startsWith('/pilot/consent/') ||
    endpoint.startsWith('/pilot/auth/parent/')
  ) {
    return 'parent';
  }
  if (endpoint.startsWith('/org/') || endpoint.startsWith('/org')) {
    return 'org';
  }
  if (endpoint.startsWith('/youth-workers/') || endpoint.startsWith('/youth-workers')) {
    return 'worker';
  }
  return 'user';
}

/**
 * Fetch CSRF token from server for a specific namespace
 */
async function getCsrfToken(namespace: CsrfNamespace = 'user'): Promise<string> {
  if (csrfTokens[namespace]) {
    return csrfTokens[namespace]!;
  }

  try {
    const response = await fetch(`${API_BASE}${csrfEndpoints[namespace]}`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfTokens[namespace] = data.csrfToken;
      return csrfTokens[namespace] || '';
    }
  } catch (error) {
    console.error(`Failed to fetch CSRF token for ${namespace}:`, error);
  }
  
  return '';
}

async function fetchApi<T = any>(
  endpoint: string,
  options?: RequestInit,
  isRetry: boolean = false
): Promise<ApiResponse<T>> {
  // Determine namespace for this endpoint
  const namespace = getNamespaceForEndpoint(endpoint);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    // Add CSRF token for state-changing requests (using namespace-specific token)
    if (options?.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
      const token = await getCsrfToken(namespace);
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers,
      ...options,
    });

    // Handle 204 No Content or empty responses
    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (response.status !== 204 && contentType?.includes('application/json')) {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }
    }

    if (!response.ok) {
      // Handle invalid CSRF token with retry (clear only the specific namespace token)
      if (response.status === 403 && data?.error === 'Invalid CSRF token' && !isRetry) {
        csrfTokens[namespace] = null;
        // Retry once with fresh token
        return fetchApi<T>(endpoint, options, true);
      }
      
      // Handle 207 Multi-Status (partial success, e.g., email failed but link generated)
      if (response.status === 207 && data) {
        return { data };
      }
      
      console.error(`API ${options?.method || 'GET'} ${endpoint} failed:`, response.status, data?.error || data?.message);
      
      const error = data?.error || data?.message || 'An error occurred';
      const issues = data?.issues as ValidationIssue[] | undefined;
      
      let friendlyError = getFriendlyErrorMessage(error || response.status);
      if (error === 'VALIDATION_ERROR' && issues && issues.length > 0) {
        friendlyError = issues[0].message;
      }
      
      return { 
        error,
        friendlyError,
        message: data?.message,
        issues,
      };
    }

    return { data };
  } catch (error) {
    console.error(`API ${options?.method || 'GET'} ${endpoint} exception:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    return { 
      error: errorMessage,
      friendlyError: getFriendlyErrorMessage(errorMessage)
    };
  }
}

/**
 * Clear CSRF token for a specific namespace (call on logout)
 * If no namespace provided, clears all tokens
 */
export function clearCsrfToken(namespace?: CsrfNamespace) {
  if (namespace) {
    csrfTokens[namespace] = null;
  } else {
    csrfTokens.user = null;
    csrfTokens.parent = null;
    csrfTokens.admin = null;
    csrfTokens.org = null;
    csrfTokens.worker = null;
  }
}

export const api = {
  // Auth
  auth: {
    register: (_email: string, _password: string, _profile?: any) =>
      Promise.resolve({
        error: 'PASSWORD_LOGIN_DISABLED',
        friendlyError:
          'Password sign-up has been retired. Please create your account with a 6-digit PIN.',
      } as ApiResponse),
    login: (_email: string, _password: string) =>
      Promise.resolve({
        error: 'PASSWORD_LOGIN_DISABLED',
        friendlyError:
          'Password sign-in has been retired. Please sign in with your login code (or email) and 6-digit PIN.',
      } as ApiResponse),
    registerWithPin: (data: { displayName: string; pin: string; dateOfBirth: string; email?: string; guardianEmail?: string; guardianName?: string; postalCode?: string }) =>
      fetchApi('/pilot/auth/youth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    loginWithPin: (pin: string, opts: { loginCode?: string; email?: string }) =>
      fetchApi('/pilot/auth/youth/login', {
        method: 'POST',
        body: JSON.stringify({ ...opts, pin }),
      }),
    setPin: (_pin: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Setting a PIN after registration has been retired. Choose your 6-digit PIN at signup.',
      } as ApiResponse),
    logout: async () => {
      clearCsrfToken('user');
      return fetchApi('/pilot/auth/youth/logout', {
        method: 'POST',
      });
    },
    getUser: () => fetchApi('/pilot/auth/youth/me'),
    resetPassword: (_email: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password reset has been retired. Sign in with your login code (or email) and 6-digit PIN.',
      } as ApiResponse),
    validateResetToken: (_token: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password reset has been retired. Sign in with your login code (or email) and 6-digit PIN.',
      } as ApiResponse),
    completePasswordReset: (_token: string, _newPassword: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password reset has been retired. Sign in with your login code (or email) and 6-digit PIN.',
      } as ApiResponse),
    updatePassword: (_newPassword: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password update has been retired. Authenticate with your 6-digit PIN.',
      } as ApiResponse),
    changePassword: (_currentPassword: string, _newPassword: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password change has been retired. Authenticate with your 6-digit PIN.',
      } as ApiResponse),
    verifyEmail: (token: string) =>
      fetchApi(`/pilot/auth/youth/verify-email/${token}`),
    resendVerification: () =>
      fetchApi('/pilot/auth/youth/resend-verification', { method: 'POST' }),
    deleteAccount: (confirm: string) =>
      fetchApi('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirm }),
      }),
    addGuardian: (data: { guardianEmail: string; guardianName: string; guardianRole: 'primary' | 'secondary' | 'emergency' }) =>
      fetchApi('/auth/add-guardian', {
        method: 'POST',
        body: JSON.stringify(data),
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
    guardianStatus: () => fetchApi('/consent/guardian-status'),
    resendGuardian: () => fetchApi('/consent/resend-guardian', { method: 'POST' }),
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
    chat: async (data: {
      message: string;
      checkinId?: string;
      moodType?: string;
      wellnessDimensions?: string[];
      timeframe?: 'today' | 'next_7_days';
      lat?: number;
      lng?: number;
    }) => {
      return await fetchApi('/ximi/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    /** @deprecated Follow-up endpoint has been removed. Returns 410 Gone. Use chat with program-related questions instead. */
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
      const result = await fetchApi('/privacy/consents');
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    
    updateConsents: async (data: { 
      consents: Record<string, boolean>; 
      reminderEnabled?: boolean;
    }) => {
      const result = await fetchApi('/privacy/consents', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    
    getAuditLog: async () => {
      const result = await fetchApi('/privacy/audit-log');
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    
    recordReminderResponse: async (action: 'viewed' | 'updated' | 'dismissed') => {
      const result = await fetchApi('/privacy/reminder-response', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    
    getAggregateStats: async () => {
      const result = await fetchApi('/privacy/aggregate-stats');
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    
    exportData: async () => {
      const result = await fetchApi('/privacy/export');
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
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

    getWorkerRequests: () => fetchApi('/privacy/worker-requests'),

    respondToWorkerRequest: (id: string, action: 'grant' | 'deny' | 'revoke', consentLevel?: {
      share_mood_timeline?: boolean;
      share_program_engagement?: boolean;
      share_checkin_streak?: boolean;
    }) => fetchApi(`/privacy/worker-requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action, consentLevel }),
    }),

    updateWorkerConsentLevel: (id: string, consentLevel: {
      share_mood_timeline?: boolean;
      share_program_engagement?: boolean;
      share_checkin_streak?: boolean;
    }) => fetchApi(`/privacy/worker-requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action: 'grant', consentLevel }),
    }),
  },

  // Outcomes - program feedback and reflections
  outcomes: {
    create: (data: {
      programId: string;
      recommendationEventId?: string | null;
      attended: boolean;
      attendanceDate: string;
      helpfulnessRating: number;
      wouldRecommend?: boolean | null;
      reflectionText?: string | null;
      moodBefore?: string | null;
      moodAfter?: string | null;
      barriersEncountered?: string[];
      barriersResolved?: boolean;
    }) => fetchApi('/outcomes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: Record<string, any>) => fetchApi(`/outcomes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  // Organization Dashboard
  org: {
    login: (email: string, password: string) =>
      fetchApi('/org/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: async () => {
      clearCsrfToken('org');
      return fetchApi('/org/logout', { method: 'POST' });
    },
    getMe: () => fetchApi('/org/me'),
    updateOrganization: (data: { name?: string; contactEmail?: string; contactPhone?: string; website?: string }) =>
      fetchApi('/org/organization', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getDashboardStats: () => fetchApi('/org/dashboard/stats'),
    getDashboard: () => fetchApi('/org/dashboard'),
    exportAttendance: (timeRange: '7days' | '30days' | 'all' = '30days') =>
      fetchApi(`/org/attendance/export?timeRange=${timeRange}`),
    getReportHistory: () => fetchApi('/org/reports/history'),
    getPrograms: () => fetchApi('/org/programs'),
    createProgram: (data: any) =>
      fetchApi('/org/programs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateProgram: (id: string, data: any) =>
      fetchApi(`/org/programs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteProgram: (id: string) =>
      fetchApi(`/org/programs/${id}`, { method: 'DELETE' }),
    getProgramAttendance: (programId: string) =>
      fetchApi(`/org/programs/${programId}/attendance`),
    recordProgramAttendance: (programId: string, data: { xidId: string; method: string; site?: string; timestamp?: string }) =>
      fetchApi(`/org/programs/${programId}/attendance`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getProgramOutcomes: (programId: string, timeRange?: '7days' | '30days' | '90days' | 'all') =>
      fetchApi(`/org/programs/${programId}/outcomes${timeRange ? `?timeRange=${timeRange}` : ''}`),
    getMembers: () => fetchApi('/org/members'),
    inviteMember: (email: string, role: 'admin' | 'facilitator' | 'viewer') =>
      fetchApi('/org/members/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),
    updateMemberRole: (userId: string, role: 'admin' | 'facilitator' | 'viewer') =>
      fetchApi(`/org/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),
    removeMember: (userId: string) =>
      fetchApi(`/org/members/${userId}`, { method: 'DELETE' }),
    getStatus: () => fetchApi('/org/status'),
    searchYouth: (query: string) => fetchApi(`/org/youth?q=${encodeURIComponent(query)}`),
    getPartnerOrganizations: () => fetchApi('/org/partner-organizations'),
    getReferrals: (status?: string) => {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.set('status', status);
      return fetchApi(`/org/referrals?${params}`);
    },
    createReferral: (data: { youth_id: string; to_org_id: string; priority: string; summary: string }) =>
      fetchApi('/org/referrals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateReferralStatus: (id: string, status: string, reason?: string) =>
      fetchApi(`/org/referrals/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason }),
      }),
    previewImport: (csvText: string) =>
      fetchApi('/org/imports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csvText,
      }),
    uploadImport: (csvText: string) =>
      fetchApi('/org/imports/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csvText,
      }),
    getImports: () => fetchApi('/org/imports'),
    getImport: (id: string) => fetchApi(`/org/imports/${id}`),
    getVerifications: (status?: string) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      return fetchApi(`/org/verifications?${params}`);
    },
    verifyListing: (id: string, notes?: string) =>
      fetchApi(`/org/verifications/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    rejectListing: (id: string, notes?: string) =>
      fetchApi(`/org/verifications/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    requestListingChanges: (id: string, changeRequested: string, notes?: string) =>
      fetchApi(`/org/verifications/${id}/request-changes`, {
        method: 'POST',
        body: JSON.stringify({ changeRequested, notes }),
      }),
    resubmitListing: (id: string) =>
      fetchApi(`/org/verifications/${id}/resubmit`, {
        method: 'POST',
      }),
  },

  // Admin Dashboard
  admin: {
    verifyAccess: (code: string) =>
      fetchApi('/admin/verify-access', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    login: (username: string, password: string) =>
      fetchApi('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: async () => {
      clearCsrfToken('admin');
      return fetchApi('/admin/logout', {
        method: 'POST',
      });
    },
    getStats: () => fetchApi('/admin/stats'),
    getAuditLogs: (params?: { 
      page?: number; 
      limit?: number; 
      action?: string; 
      tableName?: string;
      startDate?: string; 
      endDate?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.action) queryParams.set('action', params.action);
      if (params?.tableName) queryParams.set('tableName', params.tableName);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);
      
      const query = queryParams.toString();
      return fetchApi(`/admin/audit-logs${query ? `?${query}` : ''}`);
    },
    getConsentAuditLogs: (params?: {
      page?: number;
      limit?: number;
      actionType?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.actionType) queryParams.set('actionType', params.actionType);
      
      const query = queryParams.toString();
      return fetchApi(`/admin/consent-audit-logs${query ? `?${query}` : ''}`);
    },
    getOrganizations: () => fetchApi('/admin/organizations'),
    createOrganization: (data: {
      name: string;
      description?: string;
      contactEmail?: string;
      website?: string;
    }) =>
      fetchApi('/admin/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateOrganization: (id: string, data: {
      name?: string;
      description?: string;
      contactEmail?: string;
      website?: string;
    }) =>
      fetchApi(`/admin/organizations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getUsers: (params?: {
      page?: number;
      limit?: number;
      search?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.search) queryParams.set('search', params.search);
      
      const query = queryParams.toString();
      return fetchApi(`/admin/users${query ? `?${query}` : ''}`);
    },
    getUser: (id: string) => fetchApi(`/admin/users/${id}`),
    updateUserRole: (id: string, data: { isAdmin: boolean }) =>
      fetchApi(`/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getInterventions: () => fetchApi('/ai/interventions'),
    createIntervention: (data: {
      interventionType: string;
      content: string;
      triggerConditions: object;
      deliveryChannel?: string;
      cooldownPeriodHours?: number;
      active?: boolean;
    }) =>
      fetchApi('/ai/interventions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateIntervention: (id: string, data: {
      interventionType?: string;
      content?: string;
      triggerConditions?: object;
      deliveryChannel?: string;
      cooldownPeriodHours?: number;
      active?: boolean;
    }) =>
      fetchApi(`/ai/interventions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    triggerAIEngine: () =>
      fetchApi('/ai/trigger', {
        method: 'POST',
      }),
  },

  breach: {
    list: () => fetchApi('/admin/breach'),
    create: (data: {
      breachType: string;
      severity: string;
      description: string;
      affectedUserCount?: number;
      oipcNotificationRequired?: boolean;
    }) =>
      fetchApi('/admin/breach', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: {
      oipcNotifiedAt?: string;
      oipcReferenceNumber?: string;
      remediationSteps?: string;
      remediationCompletedAt?: string;
    }) =>
      fetchApi(`/admin/breach/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
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
    thisWeek: (userLat?: number, userLng?: number) => {
      const params = new URLSearchParams();
      if (userLat !== undefined) params.set('userLat', userLat.toString());
      if (userLng !== undefined) params.set('userLng', userLng.toString());
      const query = params.toString();
      return fetchApi(`/events/this-week${query ? `?${query}` : ''}`);
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
    recommendations: (userLat?: number, userLng?: number) => {
      const params = new URLSearchParams();
      if (userLat !== undefined) params.set('userLat', userLat.toString());
      if (userLng !== undefined) params.set('userLng', userLng.toString());
      const query = params.toString();
      return fetchApi<{
        recommendations: Array<{
          eventId: string;
          programId: string;
          title: string;
          programTitle: string;
          matchScore: number;
          triggerReason: string;
          tags: string[];
          locationName: string | null;
          free: boolean;
          cost: string;
          dayOfWeek: string | null;
          startTime: string;
          endTime: string;
        }>;
        count: number;
        message?: string;
      }>(`/events/recommendations${query ? `?${query}` : ''}`);
    },
  },

  // Parent Auth
  // Pilot cutover (T010 + T026): all parent auth flows now route through
  // /api/pilot/auth/parent/* (magic-link, password fallback, /me, logout)
  // and /api/pilot/auth/youth/parent-invite* (youth-initiated invite).
  // Parent password setup/reset/forgot/change-password are out of scope
  // for pilot v1 — gated behind ENABLE_PARENT_PASSWORD_FALLBACK and stubbed
  // here so callers receive a uniform PILOT_DISABLED response instead of a
  // 410 from the retired /parent-auth surface.
  parentAuth: {
    sendInvite: (email: string) =>
      fetchApi('/pilot/auth/youth/parent-invite', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    getPendingInvites: () => fetchApi('/pilot/auth/youth/parent-invites/pending'),
    getStatus: () => fetchApi('/pilot/auth/parent/me'),
    logout: async () => {
      clearCsrfToken('parent');
      return fetchApi('/pilot/auth/parent/logout', {
        method: 'POST',
      });
    },
    login: (email: string, password: string) =>
      fetchApi<{ success: boolean; parentId: string; email: string; name: string | null }>('/pilot/auth/parent/password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    validateSetupToken: (_token: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password setup is not available in this pilot. Please use the magic-link sign-in instead.',
      } as ApiResponse<{ valid: boolean; email: string; name: string | null }>),
    setPassword: (_token: string, _password: string, _name?: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password setup is not available in this pilot. Please use the magic-link sign-in instead.',
      } as ApiResponse<{ success: boolean; parentId: string }>),
    forgotPassword: (_email: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password reset is not available in this pilot. Please use the magic-link sign-in instead.',
      } as ApiResponse<{ success: boolean; message: string }>),
    requestMagicLink: (email: string) =>
      fetchApi<{ success: boolean; message: string }>('/pilot/auth/parent/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    validateResetToken: (_token: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password reset is not available in this pilot. Please use the magic-link sign-in instead.',
      } as ApiResponse<{ valid: boolean; email: string }>),
    resetPassword: (_token: string, _password: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password reset is not available in this pilot. Please use the magic-link sign-in instead.',
      } as ApiResponse<{ success: boolean; message: string }>),
    me: () =>
      fetchApi<{ authenticated: boolean; parent: { id: string; email: string; name: string | null; lastLoginAt: string | null }; linkedYouth: any[] }>('/pilot/auth/parent/me'),
    changePassword: (_currentPassword: string, _newPassword: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password change is not available in this pilot. Please use the magic-link sign-in instead.',
      } as ApiResponse),
  },

  // Pilot Auth (canonical pilot path — strict 6-digit PIN, non-enumerating)
  pilotAuth: {
    youth: {
      register: (data: {
        displayName: string;
        dateOfBirth: string;
        pin: string;
        email?: string;
        guardianEmail?: string;
        guardianName?: string;
        guardianPhone?: string;
        postalCode?: string;
      }) =>
        fetchApi('/pilot/auth/youth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      login: (pin: string, opts: { loginCode?: string; email?: string }) =>
        fetchApi('/pilot/auth/youth/login', {
          method: 'POST',
          body: JSON.stringify({ ...opts, pin }),
        }),
      logout: async () => {
        clearCsrfToken('user');
        return fetchApi('/pilot/auth/youth/logout', { method: 'POST' });
      },
    },
    parent: {
      requestMagicLink: (email: string) =>
        fetchApi<{ success: boolean; message: string }>(
          '/pilot/auth/parent/magic-link',
          {
            method: 'POST',
            body: JSON.stringify({ email }),
          }
        ),
      // Magic-link consume is a GET visited from the email; no client wrapper needed.
      passwordLogin: (email: string, password: string) =>
        fetchApi('/pilot/auth/parent/password', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }),
      logout: async () => {
        clearCsrfToken('parent');
        return fetchApi('/pilot/auth/parent/logout', { method: 'POST' });
      },
    },
  },

  // Parent Portal (filtered youth data based on privacy settings)
  parentPortal: {
    getSession: () => fetchApi('/parent-portal/session'),
    getDashboard: () => fetchApi('/parent-portal/dashboard'),
    getChildren: () => fetchApi('/parent-portal/children'),
    getDocuments: () => fetchApi('/parent-portal/documents'),
    signDocument: (documentId: string, signature: string) =>
      fetchApi(`/parent-portal/documents/${documentId}/sign`, {
        method: 'POST',
        body: JSON.stringify({ signature }),
      }),
    getYouthData: (youthId?: string) => 
      youthId 
        ? fetchApi(`/parent-portal/youth-data/${youthId}`)
        : fetchApi('/parent-portal/youth-data'),
    getPrivacySummary: (youthId: string) =>
      fetchApi(`/parent-portal/privacy-summary/${youthId}`),
    getConsentHistory: (youthId: string) =>
      fetchApi<{ success: boolean; history: any[] }>(`/parent-portal/consent-history/${youthId}`),
    withdrawConsent: (youthId: string, reason?: string) =>
      fetchApi(`/parent-portal/consent/withdraw/${youthId}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getStatus: () =>
      fetchApi<{ success: boolean; parent: any; youth: any[]; totalYouth: number }>('/parent-portal/status'),
    getMoodSummary: () =>
      fetchApi<{ success: boolean; summaries: any[]; hiddenCount: number; message: string | null }>('/parent-portal/mood-summary'),
    getAlerts: () =>
      fetchApi<{ success: boolean; alerts: any[]; totalAlerts: number; hasUrgent: boolean }>('/parent-portal/alerts'),
    getEmergencyContacts: (youthId: string) =>
      fetchApi<{ success: boolean; contacts: any[] }>(`/parent-portal/emergency-contacts/${youthId}`),
    addEmergencyContact: (youthId: string, data: { name: string; phone: string; relationship: string; email?: string; isPrimary?: boolean; notes?: string }) =>
      fetchApi(`/parent-portal/emergency-contacts/${youthId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateEmergencyContact: (id: string, data: { name?: string; phone?: string; relationship?: string; email?: string; isPrimary?: boolean; notes?: string }) =>
      fetchApi(`/parent-portal/emergency-contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteEmergencyContact: (id: string) =>
      fetchApi(`/parent-portal/emergency-contacts/${id}`, {
        method: 'DELETE',
      }),
    exportData: (youthId: string) => {
      window.open(`${API_BASE}/parent-portal/data/export/${youthId}`, '_blank');
      return Promise.resolve({ data: { success: true } });
    },
    requestDataDeletion: (youthId: string, reason?: string) =>
      fetchApi(`/parent-portal/data/delete/${youthId}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getNotificationPreferences: () =>
      fetchApi<{ success: boolean; preferences: { consentRequests: boolean; referrals: boolean; documents: boolean; moodAlerts: boolean } }>('/parent-portal/notification-preferences'),
    updateNotificationPreferences: (prefs: { consentRequests?: boolean; referrals?: boolean; documents?: boolean; moodAlerts?: boolean }) =>
      fetchApi('/parent-portal/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      }),
  },

  // Parent Auth & Portal
  // Pilot cutover (T010): /status, /me, /logout proxied to pilot router.
  parent: {
    login: (email: string, password: string) =>
      fetchApi('/pilot/auth/parent/password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: async () => {
      clearCsrfToken('parent');
      return fetchApi('/pilot/auth/parent/logout', { method: 'POST' });
    },
    getStatus: () => fetchApi('/pilot/auth/parent/me'),
    getMe: () => fetchApi('/pilot/auth/parent/me'),
    changePassword: (_currentPassword: string, _newPassword: string) =>
      Promise.resolve({
        error: 'PILOT_DISABLED',
        friendlyError:
          'Password change is not available in this pilot. Please use the magic-link sign-in instead.',
      } as ApiResponse),
    acceptInvite: (token: string) => fetchApi(`/pilot/auth/parent/accept/${token}`),
    getSession: () => fetchApi('/parent-portal/session'),
    getDashboard: () => fetchApi('/parent-portal/dashboard'),
    getChildren: () => fetchApi('/parent-portal/children'),
    getDocuments: () => fetchApi('/parent-portal/documents'),
    signDocument: (docId: string, data: any) =>
      fetchApi(`/parent-portal/documents/${docId}/sign`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  consentWallet: {
    getRequests: (status?: string) =>
      fetchApi(`/consent-wallet/requests${status ? `?status=${status}` : ''}`),
    signRequest: (id: string, signature?: string) =>
      fetchApi(`/consent-wallet/requests/${id}/sign`, {
        method: 'POST',
        body: JSON.stringify({ signature }),
      }),
    declineRequest: (id: string, reason?: string) =>
      fetchApi(`/consent-wallet/requests/${id}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    withdrawRequest: (id: string, reason?: string) =>
      fetchApi(`/consent-wallet/requests/${id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getWallet: () => fetchApi('/consent-wallet/wallet'),
    getAudit: (requestId: string) => fetchApi(`/consent-wallet/audit/${requestId}`),
    getYouthStatus: () => fetchApi('/consent-status/youth-status'),
  },

  /**
   * Canonical pilot consent wallet — identical surface to `consentWallet`
   * but routed at `/api/pilot/consent/*`. Use this from the pilot UI;
   * the legacy alias above remains for cutover compatibility only.
   */
  pilotConsent: {
    getRequests: (status?: string) =>
      fetchApi(`/pilot/consent/requests${status ? `?status=${status}` : ''}`),
    signRequest: (id: string, signature?: string) =>
      fetchApi(`/pilot/consent/requests/${id}/sign`, {
        method: 'POST',
        body: JSON.stringify({ signature }),
      }),
    declineRequest: (id: string, reason?: string) =>
      fetchApi(`/pilot/consent/requests/${id}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    withdrawRequest: (id: string, reason?: string) =>
      fetchApi(`/pilot/consent/requests/${id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getWallet: () => fetchApi('/pilot/consent/wallet'),
    getAudit: (requestId: string) => fetchApi(`/pilot/consent/audit/${requestId}`),
  },

  eventRsvps: {
    create: (eventId: string) =>
      fetchApi('/event-rsvps', {
        method: 'POST',
        body: JSON.stringify({ eventId }),
      }),
    cancel: (id: string, reason?: string) =>
      fetchApi(`/event-rsvps/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getMyRsvps: () => fetchApi('/event-rsvps/me'),
  },

  // Youth Worker
  worker: {
    login: (email: string, password: string) =>
      fetchApi('/youth-workers/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: async () => {
      clearCsrfToken('worker');
      return fetchApi('/youth-workers/logout', { method: 'POST' });
    },
    getMyYouth: () => fetchApi('/youth-workers/my-youth'),
    getYouthProfile: (youthId: string) => fetchApi(`/youth-workers/youth/${youthId}`),
    assignYouth: (youthEmail: string) =>
      fetchApi('/youth-workers/assign', {
        method: 'POST',
        body: JSON.stringify({ youthEmail }),
      }),
    getProfile: () => fetchApi('/youth-workers/profile'),
    changePassword: (currentPassword: string, newPassword: string) =>
      fetchApi('/youth-workers/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    listCaseNotes: (youthId: string) =>
      fetchApi(`/youth-workers/case-notes?youthId=${encodeURIComponent(youthId)}`),
    createCaseNote: (payload: { youthId: string; note: string; category?: string | null; tags?: string[] }) =>
      fetchApi('/youth-workers/case-notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    caseNotesSummary: (params: { timeRange: '7days' | '30days' | 'all'; youthId?: string }) => {
      const qs = new URLSearchParams();
      qs.set('timeRange', params.timeRange);
      if (params.youthId) qs.set('youthId', params.youthId);
      return fetchApi(`/youth-workers/case-notes/summary?${qs.toString()}`);
    },
    exportCaseNotes: (params: { timeRange: '7days' | '30days' | 'all'; youthId?: string }) => {
      const qs = new URLSearchParams();
      qs.set('timeRange', params.timeRange);
      if (params.youthId) qs.set('youthId', params.youthId);
      return fetchApi(`/youth-workers/case-notes/export?${qs.toString()}`);
    },
    getConsentRequests: () => fetchApi('/youth-workers/consent-requests'),
    createConsentRequest: (youthId: string, requestedScopes?: string[]) =>
      fetchApi('/youth-workers/consent-requests', {
        method: 'POST',
        body: JSON.stringify({ youthId, requestedScopes }),
      }),
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

  // Safety Plan
  safetyPlan: {
    get: () => fetchApi('/safety-plan'),
    update: (data: { planData: any; markReviewed?: boolean }) =>
      fetchApi('/safety-plan', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    createShare: (params: { label?: string; expiresInDays?: number }) =>
      fetchApi('/safety-plan/share', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    listShares: () => fetchApi('/safety-plan/shares'),
    revokeShare: (id: string) =>
      fetchApi(`/safety-plan/share/${id}`, {
        method: 'DELETE',
      }),
    viewShared: (token: string) => fetchApi(`/safety-plan/view/${token}`),
  },

  // Health Status (system health checks)
  health: {
    status: () => fetchApi('/health'),
    live: () => fetchApi('/health/live'),
    ready: () => fetchApi('/health/ready'),
  },

  // Health Profile (user health data)
  healthProfile: {
    get: () => fetchApi('/health-profile'),
    update: (data: any) =>
      fetchApi('/health-profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: () => fetchApi('/health-profile', { method: 'DELETE' }),
  },

  // Achievements (gamification and milestone tracking)
  achievements: {
    list: () => fetchApi('/achievements'),
    check: () =>
      fetchApi('/achievements/check', {
        method: 'POST',
      }),
  },

  // Analytics (user data analytics and trends)
  analytics: {
    getMoodByDay: () => fetchApi('/analytics/mood-by-day'),
    getCrisisByDay: () => fetchApi('/analytics/crisis-by-day'),
    getProgramEngagement: () => fetchApi('/analytics/program-engagement'),
    getAiTransparency: () => fetchApi('/analytics/ai-transparency'),
  },

  // Mood Drop (quick mood logging)
  moodDrop: {
    create: (moodLevel: number, tags?: string[]) =>
      fetchApi('/mood-drop', {
        method: 'POST',
        body: JSON.stringify({ moodLevel, tags }),
      }),
    getPublic: () => fetchApi('/mood-drop/public'),
    getMine: () => fetchApi('/mood-drop/my'),
  },

  // Orb (visual wellness indicator)
  orb: {
    getSummary: () => fetchApi('/orb/summary'),
  },

  // Orb Snapshots (historical orb states)
  orbSnapshots: {
    capture: () =>
      fetchApi('/orb-snapshots/capture', {
        method: 'POST',
      }),
    getRecent: () => fetchApi('/orb-snapshots/recent'),
    getByDate: (date: string) => fetchApi(`/orb-snapshots/${date}`),
  },

  // Transparency Dashboard (aggregated anonymized data)
  transparency: {
    getStats: () => fetchApi('/transparency/stats'),
    getMoodDistribution: () => fetchApi('/transparency/mood-distribution'),
    getOptInRates: () => fetchApi('/transparency/opt-in-rates'),
  },

  // Skip Token (guest access tokens)
  skipToken: {
    generate: (guestId?: string) =>
      fetchApi('/skip-token', {
        method: 'POST',
        body: JSON.stringify({ guestId }),
      }),
    verify: (token: string) =>
      fetchApi('/skip-token/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  },

  // Geographic Data (location aggregation with privacy)
  geo: {
    aggregate: (data: any) =>
      fetchApi('/geo/aggregate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getHexForLocation: (lat: number, lng: number) =>
      fetchApi('/geo/hex-for-location', {
        method: 'POST',
        body: JSON.stringify({ lat, lng }),
      }),
  },

  // KPI Tracking (key performance indicators)
  kpi: {
    getDailyCheckins: () => fetchApi('/kpi/daily-checkins'),
    getStreakCompletion: () => fetchApi('/kpi/streak-completion'),
    getExploreUnlocks: () => fetchApi('/kpi/explore-unlocks'),
    getOptInRates: () => fetchApi('/kpi/opt-in-rates'),
    getStaffUsage: () => fetchApi('/kpi/staff-usage'),
    getReferralConversion: () => fetchApi('/kpi/referral-conversion'),
    getCrisisRouting: () => fetchApi('/kpi/crisis-routing'),
    getSummary: () => fetchApi('/kpi/summary'),
    export: () => fetchApi('/kpi/export'),
  },

  // Partner Consent (external API partner consent delegation)
  partnerConsent: {
    getHealth: () => fetchApi('/partner-consent/health'),
    getScopes: () => fetchApi('/partner-consent/scopes'),
    requestConsent: (partnerName: string, requestedScopes: string[]) =>
      fetchApi('/partner-consent/consent-request', {
        method: 'POST',
        body: JSON.stringify({ partnerName, requestedScopes }),
      }),
    getConsentStatus: (delegationId: string) =>
      fetchApi(`/partner-consent/consent-status/${delegationId}`),
    withdrawConsent: (delegationId: string) =>
      fetchApi(`/partner-consent/consent-withdraw/${delegationId}`, {
        method: 'POST',
      }),
    getMyConsents: () => fetchApi('/partner-consent/my-consents'),
  },

  rsvp: {
    myRsvps: () => fetchApi('/programs/user/rsvps'),
  },

  // api.tournaments removed per pilot lockdown. /api/tournaments returns 410.

  get: <T = any>(endpoint: string) => fetchApi<T>(endpoint),
  post: <T = any>(endpoint: string, data: any) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export { fetchApi };
export default api;
