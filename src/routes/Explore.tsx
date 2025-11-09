import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ExploreTabs from '@/ui/explore/ExploreTabs';
import ProgramList from '@/ui/explore/ProgramList';
import ProgramMap from '@/ui/explore/ProgramMap';
import SavedList from '@/ui/explore/SavedList';
import XimiDock from '@/ui/explore/XimiDock';
import CrisisSheet from '@/ui/crisis/CrisisSheet';
import { useSession } from '@/lib/session';
import { useExploreGate } from '@/hooks/useExploreGate';

export default function Explore() {
  const { view } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useSession();
  const { isGateOpen, needsCheckIn, isLoading } = useExploreGate();
  const currentView = view === 'map' ? 'map' : view === 'saved' ? 'saved' : 'programs';
  const [crisisOpen, setCrisisOpen] = useState(false);

  // 8am Gate Enforcement: Redirect to check-in if gate not passed
  useEffect(() => {
    // Only enforce for authenticated users
    if (!user || isLoading) return;
    
    // Allow bypass with ?skip_gate=true query param (for testing/emergency)
    if (searchParams.get('skip_gate') === 'true') return;

    // If user needs to do check-in to access Explore
    if (needsCheckIn && !isGateOpen) {
      navigate('/check-in?gate=explore', { replace: true });
    }
  }, [user, isGateOpen, needsCheckIn, isLoading, navigate, searchParams]);

  return (
    <>
      <motion.div
        className="py-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-display font-bold text-deepSage">
            Explore
          </h1>
          <p className="text-textSecondaryLight">
            Discover programs, events, and activities in your community
          </p>
        </div>

        {/* Guest Notice Banner */}
        {!user && (
          <motion.div
            className="cosmic-card p-4 bg-gradient-to-r from-teal/10 to-sage/10 border-l-4 border-teal"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 mt-0.5 text-teal">
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-deepSage">
                  Sign in to see all upcoming programs
                </p>
                <p className="text-sm text-textSecondaryLight">
                  Guests can browse today's programs only. Create an account or sign in to view all future programs and events.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Segmented Control */}
        <ExploreTabs current={currentView} />
        
        {/* Content based on current view */}
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {currentView === 'programs' && <ProgramList />}
          {currentView === 'map' && <ProgramMap />}
          {currentView === 'saved' && <SavedList />}
        </motion.div>

        {/* Footer Links Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Room XI is committed to transparency and privacy protection
            </p>
            <a
              href="/transparency"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-teal hover:text-teal-700 hover:underline transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Transparency Dashboard
            </a>
            <p className="text-xs text-gray-500">
              See aggregated community statistics with privacy protection
            </p>
          </div>
        </div>
        
        {/* Spacer for floating dock */}
        <div className="h-32" />
      </motion.div>
      
      {/* Ximi Dock - Floating AI assistant (authenticated users only) */}
      {user && <XimiDock onCrisis={() => setCrisisOpen(true)} />}
      
      {/* Crisis Support Sheet */}
      <CrisisSheet open={crisisOpen} onClose={() => setCrisisOpen(false)} />
    </>
  );
}
