import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/lib/session';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RequireAuth({ children, redirectTo = '/auth/login' }: RequireAuthProps) {
  const { loading, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(redirectTo, { 
        replace: true, 
        state: { from: location.pathname } 
      });
    }
  }, [loading, isAuthenticated, navigate, redirectTo, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
