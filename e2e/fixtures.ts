import { test as base, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

export interface TestCredentials {
  youth: {
    email: string;
    password: string;
    dateOfBirth: string;
    firstName: string;
  };
  parent: {
    email: string;
    password: string;
  };
  org: {
    email: string;
    password: string;
  };
  admin: {
    accessCode: string;
    username: string;
    password: string;
  };
}

export const testCredentials: TestCredentials = {
  youth: {
    email: `test-youth-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    dateOfBirth: '2005-01-15',
    firstName: 'TestYouth',
  },
  parent: {
    email: 'test-parent@example.com',
    password: 'TestPassword123!',
  },
  org: {
    email: 'test-org@example.com',
    password: 'TestPassword123!',
  },
  admin: {
    accessCode: process.env.ADMIN_ACCESS_CODE || 'test-access-code',
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin-password',
  },
};

export async function getCsrfToken(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${API_BASE}/auth/csrf-token`);
  const data = await response.json();
  return data.csrfToken;
}

export async function authenticateYouth(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<{ success: boolean; csrfToken: string }> {
  const csrfToken = await getCsrfToken(request);
  
  const response = await request.post(`${API_BASE}/auth/login`, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: { email, password },
  });

  return {
    success: response.ok(),
    csrfToken,
  };
}

export async function authenticateParent(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<{ success: boolean; csrfToken: string }> {
  const csrfToken = await getCsrfToken(request);
  
  const response = await request.post(`${API_BASE}/parent-auth/login`, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: { email, password },
  });

  return {
    success: response.ok(),
    csrfToken,
  };
}

export async function authenticateAdmin(
  request: APIRequestContext,
  accessCode: string,
  username: string,
  password: string
): Promise<{ accessGranted: boolean; loggedIn: boolean; csrfToken: string }> {
  const csrfToken = await getCsrfToken(request);
  
  const accessResponse = await request.post(`${API_BASE}/admin/verify-access`, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: { code: accessCode },
  });

  if (!accessResponse.ok()) {
    return { accessGranted: false, loggedIn: false, csrfToken };
  }

  const loginResponse = await request.post(`${API_BASE}/admin/login`, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: { username, password },
  });

  return {
    accessGranted: true,
    loggedIn: loginResponse.ok(),
    csrfToken,
  };
}

export { BASE_URL, API_BASE };

export const test = base.extend<{
  apiContext: APIRequestContext;
}>({
  apiContext: async ({ request }, use) => {
    await use(request);
  },
});

export { expect } from '@playwright/test';
