import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

interface SessionContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const { data, error } = await api.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setLoading(false);
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

  return (
    <SessionContext.Provider value={{ user, loading, signOut, refreshSession }}>
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
