import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Heart, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
              {t('explore.saved.signInToSave')}
            </h3>
            <p className="text-textSecondaryLight max-w-sm mx-auto">
              {t('explore.saved.signInDescription')}
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Link
            to="/auth/register"
            className="inline-block cosmic-button"
          >
            {t('auth.createAccount')}
          </Link>
          
          <p className="text-sm text-textSecondaryLight">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/auth/login" className="text-teal hover:text-teal/80 font-medium">
              {t('auth.signIn')}
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
          <div className="w-5 h-5 bg-sage/20 rounded animate-pulse" />
          <div className="h-6 bg-sage/20 rounded w-32 animate-pulse" />
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
              {t('explore.saved.noSavedPrograms')}
            </h3>
            <p className="text-textSecondaryLight max-w-sm mx-auto">
              {t('explore.saved.noSavedDescription')}
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Link
            to="/explore"
            className="inline-block cosmic-button"
          >
            {t('landing.explorePrograms')}
          </Link>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-textSecondaryLight">
            <div className="flex items-center space-x-1">
              <Bookmark className="w-4 h-4" />
              <span>{t('explore.saved.savePrograms')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4" />
              <span>{t('explore.saved.buildYourList')}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-2">
          <Bookmark className="w-5 h-5 text-gold" />
          <h2 className="text-lg font-semibold text-deepSage">
            {t('explore.saved.title')}
          </h2>
        </div>
        
        <span className="text-sm text-textSecondaryLight">
          {t('explore.saved.count', { count: savedPrograms.length })}
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
              {t('explore.saved.proTip')}
            </h4>
            <p className="text-sm text-textSecondaryLight">
              {t('explore.saved.proTipDescription')}
            </p>
          </div>
        </div>
      </motion.div>

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
          {t('explore.saved.findMore')}
        </Link>
        
        <Link
          to="/explore/map"
          className="flex-1 ghost-button text-center flex items-center justify-center space-x-1"
        >
          <span>{t('explore.saved.viewOnMap')}</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </motion.div>

      {!navigator.onLine && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-4 bg-sage/10 border-sage/20"
        >
          <p className="text-sm text-sageText text-center">
            {t('explore.saved.offlineNotice')}
          </p>
        </motion.div>
      )}
    </div>
  );
}
