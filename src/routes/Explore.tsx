import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ExploreTabs from '@/ui/explore/ExploreTabs';
import ProgramList from '@/ui/explore/ProgramList';
import ProgramMap from '@/ui/explore/ProgramMap';
import SavedList from '@/ui/explore/SavedList';
import XimiDock from '@/ui/explore/XimiDock';
import CrisisSheet from '@/ui/crisis/CrisisSheet';
import { useSession } from '@/lib/session';

export default function Explore() {
  const { view } = useParams();
  const { user } = useSession();
  const currentView = view === 'map' ? 'map' : view === 'saved' ? 'saved' : 'programs';
  const [crisisOpen, setCrisisOpen] = useState(false);

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
