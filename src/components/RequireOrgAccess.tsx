import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface RequireOrgAccessProps {
  children: React.ReactNode;
}

export default function RequireOrgAccess({ children }: RequireOrgAccessProps) {
  const [loading, setLoading] = useState(true);
  const [hasOrgAccess, setHasOrgAccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkOrgAccess = async () => {
      try {
        const response = await fetch('/api/org/status', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.hasOrgAccess) {
            setHasOrgAccess(true);
          } else {
            navigate('/explore', { replace: true });
          }
        } else if (response.status === 401) {
          navigate('/auth/login', { 
            replace: true, 
            state: { from: location.pathname } 
          });
        } else if (response.status === 403) {
          navigate('/explore', { replace: true });
        } else {
          setHasOrgAccess(false);
          navigate('/auth/login', { 
            replace: true, 
            state: { from: location.pathname } 
          });
        }
      } catch (error) {
        setHasOrgAccess(false);
        navigate('/auth/login', { 
          replace: true, 
          state: { from: location.pathname } 
        });
      } finally {
        setLoading(false);
      }
    };

    checkOrgAccess();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasOrgAccess) {
    return null;
  }

  return <>{children}</>;
}
