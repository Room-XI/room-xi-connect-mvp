import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  age?: number;
  requiresGuardianVerification?: boolean;
  guardianVerifiedAt?: string | null;
  [key: string]: any;
}

interface SessionContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  needsGuardianVerification: boolean;
  isAuthenticated: boolean;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
  needsGuardianVerification: false,
  isAuthenticated: false,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (retries = 2) => {
    // Always try to fetch user - httpOnly cookies aren't visible to JS
    // but the server can still validate them
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await api.auth.getUser();
        if (!error && data?.user) {
          setUser(data.user);
          setLoading(false);
          return;
        } else {
          // No valid session - user is not logged in
          setUser(null);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.warn(`Session fetch attempt ${attempt} failed:`, error);
        
        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        } else {
          // All retries exhausted - assume not logged in
          setUser(null);
          setLoading(false);
          return;
        }
      }
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const refreshSession = async () => {
    setLoading(true);
    await fetchUser();
  };

  const signOut = async () => {
    await api.auth.logout();
    setUser(null);
    window.location.href = '/';
  };

  const needsGuardianVerification = Boolean(
    user?.requiresGuardianVerification && !user?.guardianVerifiedAt
  );

  const isAuthenticated = user !== null;

  return (
    <SessionContext.Provider value={{ user, loading, signOut, refreshSession, needsGuardianVerification, isAuthenticated }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Standalone hook for components that need session info
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.getUser().then(({ data, error }) => {
      if (!error && data?.user) {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
