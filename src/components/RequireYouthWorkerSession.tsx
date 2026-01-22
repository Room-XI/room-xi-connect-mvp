import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface RequireYouthWorkerSessionProps {
  children: React.ReactNode;
}

export default function RequireYouthWorkerSession({ children }: RequireYouthWorkerSessionProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/youth-workers/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.youthWorkerId) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            navigate('/youth-worker/login', { 
              replace: true, 
              state: { from: location.pathname } 
            });
          }
        } else {
          setIsAuthenticated(false);
          navigate('/youth-worker/login', { 
            replace: true, 
            state: { from: location.pathname } 
          });
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/youth-worker/login', { 
          replace: true, 
          state: { from: location.pathname } 
        });
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [navigate, location.pathname]);

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
