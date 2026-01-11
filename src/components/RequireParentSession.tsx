import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface RequireParentSessionProps {
  children: React.ReactNode;
}

export default function RequireParentSession({ children }: RequireParentSessionProps) {
  const [loading, setLoading] = useState(true);
  const [isParentAuthenticated, setIsParentAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkParentSession = async () => {
      try {
        const response = await fetch('/api/parent-auth/status', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setIsParentAuthenticated(true);
          } else {
            setIsParentAuthenticated(false);
            navigate('/parent/login', { 
              replace: true, 
              state: { from: location.pathname } 
            });
          }
        } else {
          setIsParentAuthenticated(false);
          navigate('/parent/login', { 
            replace: true, 
            state: { from: location.pathname } 
          });
        }
      } catch (error) {
        setIsParentAuthenticated(false);
        navigate('/parent/login', { 
          replace: true, 
          state: { from: location.pathname } 
        });
      } finally {
        setLoading(false);
      }
    };

    checkParentSession();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isParentAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
