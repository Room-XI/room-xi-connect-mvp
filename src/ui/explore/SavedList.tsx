import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Heart, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProgramCard from './ProgramCard';
import api from '@/lib/api';
import { useSession } from '@/lib/session';

interface GroupedProgram {
  programId: string;
  programTitle: string;
  programDescription: string | null;
  programTags: string[];
  organizer: string | null;
  locationName: string | null;
  address: string | null;
  ageMin: number | null;
  ageMax: number | null;
  costCents: number;
  isDropIn: boolean;
  weeklySchedule: Array<{
    days: string[];
    startTime: string;
    endTime: string;
    location: string | null;
  }>;
  scheduleSummary: string;
}

interface SavedProgram {
  programId: string;
  createdAt: string;
  programs: GroupedProgram;
}

export default function SavedList() {
  const { user } = useSession();
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSavedPrograms();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadSavedPrograms = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await api.programs.saved.list();

      if (error) {
        console.error('Error loading saved programs:', error);
        return;
      }

      // Transform API response to match component expectations (GroupedProgram interface)
      const savedPrograms = (data || []).map((program: any) => ({
        programId: program.id || program.programId,
        createdAt: program.createdAt || new Date().toISOString(),
        programs: {
          programId: program.id || program.programId,
          programTitle: program.title || program.programTitle || '',
          programDescription: program.description || program.programDescription || null,
          programTags: program.tags || program.programTags || [],
          organizer: program.organizer || null,
          locationName: program.locationName || null,
          address: program.address || null,
          ageMin: program.ageMin || null,
          ageMax: program.ageMax || null,
          costCents: program.costCents || 0,
          isDropIn: program.isDropIn || false,
          weeklySchedule: program.weeklySchedule || [],
          scheduleSummary: program.scheduleSummary || ''
        } as GroupedProgram
      }));
      
      setSavedPrograms(savedPrograms);
    } catch (error) {
      console.error('Unexpected error loading saved programs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show sign-in prompt for unauthenticated users
  if (!user) {
    return (
      <motion.div
        className="cosmic-card p-8 text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-gold/10 rounded-2xl flex items-center justify-center">
            <Bookmark className="w-10 h-10 text-gold" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-deepSage">
              Sign in to Save Programs
            </h3>
            <p className="text-textSecondaryLight max-w-sm mx-auto">
              Create a free account to save your favorite programs and access them from any device.
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Link
            to="/auth/register"
            className="inline-block cosmic-button"
          >
            Create Account
          </Link>
          
          <p className="text-sm text-textSecondaryLight">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-teal hover:text-teal/80 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-sage/10 rounded animate-pulse" />
          <div className="h-6 bg-sage/10 rounded w-32 animate-pulse" />
        </div>
        
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cosmic-card p-4 animate-pulse">
              <div className="space-y-3">
                <div className="h-5 bg-sage/10 rounded" />
                <div className="h-4 bg-sage/10 rounded w-3/4" />
                <div className="flex space-x-2">
                  <div className="h-6 bg-sage/10 rounded-full w-16" />
                  <div className="h-6 bg-sage/10 rounded-full w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (savedPrograms.length === 0) {
    return (
      <motion.div
        className="cosmic-card p-8 text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-gold/10 rounded-2xl flex items-center justify-center">
            <Bookmark className="w-10 h-10 text-gold" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-deepSage">
              No Saved Programs Yet
            </h3>
            <p className="text-textSecondaryLight max-w-sm mx-auto">
              Save programs you're interested in to easily find them later. 
              Look for the bookmark icon on program cards.
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Link
            to="/explore"
            className="inline-block cosmic-button"
          >
            Explore Programs
          </Link>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-textSecondaryLight">
            <div className="flex items-center space-x-1">
              <Bookmark className="w-4 h-4" />
              <span>Save programs</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4" />
              <span>Build your list</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-2">
          <Bookmark className="w-5 h-5 text-gold" />
          <h2 className="text-lg font-semibold text-deepSage">
            Saved Programs
          </h2>
        </div>
        
        <span className="text-sm text-textSecondaryLight">
          {savedPrograms.length} saved
        </span>
      </motion.div>

      {/* Saved Programs List */}
      <AnimatePresence mode="wait">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {savedPrograms.map((saved, index) => (
            <motion.div
              key={saved.programId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <ProgramCard program={saved.programs} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Tips */}
      <motion.div
        className="cosmic-card p-4 bg-cosmic-gradient"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="flex items-start space-x-3">
          <Heart className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-medium text-deepSage">
              Pro tip
            </h4>
            <p className="text-sm text-textSecondaryLight">
              Saved programs sync across all your devices and work offline. 
              You can also share your saved list with friends and family.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="flex space-x-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <Link
          to="/explore"
          className="flex-1 ghost-button text-center"
        >
          Find More Programs
        </Link>
        
        <Link
          to="/explore/map"
          className="flex-1 ghost-button text-center flex items-center justify-center space-x-1"
        >
          <span>View on Map</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Offline Notice */}
      {!navigator.onLine && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-4 bg-sage/10 border-sage/20"
        >
          <p className="text-sm text-sage text-center">
            You're offline. Your saved programs are cached and available to view.
          </p>
        </motion.div>
      )}
    </div>
  );
}
