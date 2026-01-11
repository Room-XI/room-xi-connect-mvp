import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface RequireAdminSessionProps {
  children: React.ReactNode;
}

export default function RequireAdminSession({ children }: RequireAdminSessionProps) {
  const [loading, setLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/status', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.isAdmin) {
            setIsAdminAuthenticated(true);
          } else {
            setIsAdminAuthenticated(false);
            navigate('/control/entrance', { 
              replace: true, 
              state: { from: location.pathname } 
            });
          }
        } else {
          setIsAdminAuthenticated(false);
          navigate('/control/entrance', { 
            replace: true, 
            state: { from: location.pathname } 
          });
        }
      } catch (error) {
        setIsAdminAuthenticated(false);
        navigate('/control/entrance', { 
          replace: true, 
          state: { from: location.pathname } 
        });
      } finally {
        setLoading(false);
      }
    };

    checkAdminSession();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
