import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../ui/Header';
import Tab from './Tab';
import { Home, Compass, QrCode, User } from 'lucide-react';
import { useQueue } from '@/lib/queue';
import { useSession } from '@/lib/session';
import { useMatureMinorAssessment } from '@/hooks/useMatureMinorAssessment';
import MatureMinorAssessment from '@/components/MatureMinorAssessment';

export default function App() {
  const { itemCount } = useQueue();
  const { user, loading } = useSession();
  const { assessmentRequired, loading: assessmentLoading, checkStatus } = useMatureMinorAssessment();
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentDismissed, setAssessmentDismissed] = useState(false);

  useEffect(() => {
    if (user && assessmentRequired && !assessmentDismissed) {
      setShowAssessmentModal(true);
    }
  }, [user, assessmentRequired, assessmentDismissed]);

  const handleAssessmentComplete = () => {
    setShowAssessmentModal(false);
    setAssessmentDismissed(true);
    checkStatus();
  };

  const handleAssessmentClose = () => {
    setShowAssessmentModal(false);
    setAssessmentDismissed(true);
  };

  if (loading || (user && assessmentLoading)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-cream">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-textSecondaryLight">Loading...</p>
        </div>
      </div>
    );
  }

  const publicRoutes = ['/auth', '/explore', '/events', '/program', '/transparency', '/control/entrance', '/about', '/privacy-policy', '/terms-of-service', '/home'];
  const currentPath = window.location.pathname;
  const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));

  if (!user && !isPublicRoute) {
    window.location.href = '/explore';
    return null;
  }

  const isAuthRoute = currentPath.startsWith('/auth') || currentPath.startsWith('/control/entrance');

  return (
    <div className="min-h-dvh flex flex-col bg-cream text-textPrimaryLight">
      {!isAuthRoute && <Header />}
      
      <main 
        id="main-content" 
        className={`flex-1 px-4 max-w-xl mx-auto w-full ${
          isAuthRoute ? 'py-8' : 'pb-24'
        }`}
        tabIndex={-1}
      >
        <Outlet />
      </main>
      
      {!isAuthRoute && (
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-surface border-t border-borderMutedLight/60 safe-area-bottom"
          role="navigation"
          aria-label="Main navigation"
        >
          {user ? (
            <div className="max-w-xl mx-auto grid grid-cols-4" role="menubar">
              <Tab to="/home" icon={<Home />} label="Home" />
              <Tab to="/explore" icon={<Compass />} label="Explore" />
              <Tab to="/qr" icon={<QrCode />} label="QR" />
              <Tab to="/me" icon={<User />} label="Me" showDot={itemCount > 0} />
            </div>
          ) : (
            <div className="max-w-xl mx-auto grid grid-cols-2" role="menubar">
              <Tab to="/explore" icon={<Compass />} label="Explore" />
              <Tab to="/auth/login" icon={<User />} label="Sign In" />
            </div>
          )}
        </nav>
      )}

      {showAssessmentModal && (
        <MatureMinorAssessment
          onComplete={handleAssessmentComplete}
          onClose={handleAssessmentClose}
        />
      )}
    </div>
  );
}
