import { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSession } from '@/lib/session';
import { Clock, Mail } from 'lucide-react';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireGuardianVerification?: boolean;
}

export default function RequireAuth({ 
  children, 
  redirectTo = '/auth/login',
  requireGuardianVerification = true 
}: RequireAuthProps) {
  const { loading, isAuthenticated, needsGuardianVerification } = useSession();
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

  if (requireGuardianVerification && needsGuardianVerification) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-display font-bold text-deepSage">
              Guardian Verification Required
            </h1>
            <p className="text-textSecondaryLight">
              Because you're under 16, we need your guardian to verify your account before you can access this feature.
            </p>
          </div>

          <div className="cosmic-card p-4 bg-amber-50 border-amber-200 text-left">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900">
                <p className="font-medium mb-1">Check with your guardian</p>
                <p>
                  We sent a verification link to your guardian's email. Once they approve, you'll have full access.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/explore"
              className="w-full cosmic-button block text-center"
            >
              Browse Programs
            </Link>
            <Link
              to="/safety-resources"
              className="w-full ghost-button block text-center"
            >
              View Safety Resources
            </Link>
          </div>

          <p className="text-xs text-textSecondaryLight">
            Need help? Ask your guardian to check their email or contact us for support.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
