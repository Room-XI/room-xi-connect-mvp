import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../ui/Header';
import Tab from './Tab';
import { Home, Compass, CalendarDays, MoreHorizontal, User } from 'lucide-react';
import { useSession } from '@/lib/session';
import { useMatureMinorAssessment } from '@/hooks/useMatureMinorAssessment';
import MatureMinorAssessment from '@/components/MatureMinorAssessment';
import OfflineSyncIndicator from '@/components/OfflineSyncIndicator';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { FloatingCrisisButton } from '@/components/FloatingCrisisButton';

export default function App() {
  const { user, loading } = useSession();
  const { assessmentRequired, loading: assessmentLoading, checkStatus } = useMatureMinorAssessment();
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentDismissed, setAssessmentDismissed] = useState(false);
  const location = useLocation();

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
      <>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-deepSage focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal"
        >
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1} className="min-h-dvh flex items-center justify-center bg-cream">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-textSecondaryLight">Loading...</p>
          </div>
        </main>
      </>
    );
  }

  const currentPath = location.pathname;
  const isAuthRoute = currentPath.startsWith('/auth') || currentPath.startsWith('/control/entrance');
  const isPortalRoute = currentPath.startsWith('/parent') || 
    currentPath.startsWith('/admin') || 
    currentPath.startsWith('/org') ||
    currentPath.startsWith('/youth-worker') ||
    currentPath.startsWith('/worker');
  const hideYouthNav = isAuthRoute || isPortalRoute;

  return (
    <div className="min-h-dvh flex flex-col bg-cream text-textPrimaryLight">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-deepSage focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal"
      >
        Skip to main content
      </a>
      {!hideYouthNav && <Header />}
      
      {isPortalRoute || isAuthRoute ? (
        <main id="main-content" tabIndex={-1} className={`flex-1 ${isAuthRoute ? 'py-8' : ''}`}>
          <OfflineIndicator />
          <Outlet />
        </main>
      ) : (
        <main 
          id="main-content" 
          className="flex-1 px-4 max-w-xl mx-auto w-full pb-24"
          tabIndex={-1}
        >
          <OfflineIndicator />
          {!hideYouthNav && <OfflineSyncIndicator />}
          <Outlet />
          {!hideYouthNav && <FloatingCrisisButton />}
        </main>
      )}
      
      {!hideYouthNav && (
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-surface border-t border-borderMutedLight/60 safe-area-bottom"
          role="navigation"
          aria-label="Main navigation"
        >
          {user ? (
            <div className="max-w-xl mx-auto grid grid-cols-4" role="menubar">
              <Tab to="/home" icon={<Home />} translationKey="nav.home" />
              <Tab to="/explore" icon={<Compass />} translationKey="nav.explore" />
              <Tab to="/schedule" icon={<CalendarDays />} translationKey="nav.schedule" />
              <Tab to="/more" icon={<MoreHorizontal />} translationKey="nav.more" />
            </div>
          ) : (
            <div className="max-w-xl mx-auto grid grid-cols-2" role="menubar">
              <Tab to="/explore" icon={<Compass />} translationKey="nav.explore" />
              <Tab to="/auth/login" icon={<User />} translationKey="nav.signIn" />
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
