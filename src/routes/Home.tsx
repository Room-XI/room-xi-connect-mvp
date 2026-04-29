import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import GradientMoodOrb from '@/components/GradientMoodOrb';
import { AmbientMoodTint } from '@/components/AmbientMoodTint';
import { OrbTimestamp } from '@/components/OrbTimestamp';
import { OrbExportModal } from '@/components/OrbExportModal';
import CheckInForm from '@/ui/home/CheckInForm';
import SuggestedPrograms from '@/ui/home/SuggestedPrograms';
import QuickActions from '@/ui/home/QuickActions';
import MyNextThing from '@/ui/home/MyNextThing';
import XimiDock from '@/ui/explore/XimiDock';
import CrisisSheet from '@/ui/crisis/CrisisSheet';
import StreakPerks from '@/components/StreakPerks';
import QuoteCard from '@/components/QuoteCard';
import MilestoneOrb from '@/components/MilestoneOrb';
import { ForYouRecommendations } from '@/components/ForYouRecommendations';
// XiPWidget removed per pilot lockdown (Prompt 1). XiP is out of pilot v1.
import api from '@/lib/api';
import { useSession } from '@/lib/session';
import { useMoodGradient } from '@/hooks/useMoodGradient';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';

interface CheckIn {
  id: string;
  timestamp: string;
  moodLevel16: number;
  moodType: string | null;
  affectTags: string[] | null;
  note: string | null;
}

interface Profile {
  streak_count: number;
  last_checkin_date: string | null;
}

interface PrivacyConsents {
  dailyQuotes: boolean;
}

export default function Home() {
  const { t } = useTranslation();
  const { user } = useSession();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<CheckIn | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [privacyConsents, setPrivacyConsents] = useState<PrivacyConsents>({ dailyQuotes: false });
  const [showMilestoneOrb, setShowMilestoneOrb] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
  // Mood gradient hook for 7-day orb visualization
  const { summary, refetch: refetchMoodData } = useMoodGradient();
  
  // Ref for orb export functionality
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load check-ins (may fail if guardian verification required - that's OK)
      const { data: checkInsData, error: checkInsError } = await api.checkins.list();
      if (!checkInsError && checkInsData && checkInsData.length > 0) {
        setLastCheckIn(checkInsData[0]);
      }

      // Load profile for streak info
      const { data: profileData, error: profileError } = await api.profile.get();
      if (!profileError && profileData) {
        setProfile({
          streak_count: profileData.streakCount || 0,
          last_checkin_date: profileData.lastCheckinDate,
        });
        
        // Check if it's a milestone (28-day or multiple)
        if (profileData.streakCount === 28 || (profileData.streakCount > 28 && profileData.streakCount % 28 === 0)) {
          setShowMilestoneOrb(true);
        }
      }

      // Load privacy consents
      try {
        const privacyData = await api.privacy.getConsents();
        if (privacyData && privacyData.consents) {
          setPrivacyConsents({
            dailyQuotes: privacyData.consents.dailyQuotes || false
          });
        }
      } catch (err) {
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSuccess = () => {
    // Reload user data after successful check-in
    loadUserData();
    // Refresh mood gradient data for updated orb
    refetchMoodData();
  };
  
  const handleExportOrb = async () => {
    if (!orbRef.current) return;
    
    try {
      const canvas = await html2canvas(orbRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `mood-orb-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
      
      setExportModalOpen(false);
    } catch (error) {
      console.error('Failed to export orb:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name || 'there';
    
    if (hour < 12) return t('home.greetingMorning', { name });
    if (hour < 17) return t('home.greetingAfternoon', { name });
    return t('home.greetingEvening', { name });
  };

  const hasCheckedInToday = () => {
    if (!lastCheckIn) return false;
    const today = new Date().toDateString();
    const checkInDate = new Date(lastCheckIn.timestamp).toDateString();
    return today === checkInDate;
  };

  if (loading) {
    return (
      <div className="py-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="w-48 h-48 mx-auto bg-sage/20 rounded-full animate-pulse" />
          <div className="h-6 bg-sage/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // First-time user with no check-ins yet
  const isFirstTime = !lastCheckIn;

  return (
    <>
      {/* Ambient mood tint based on dominant mood */}
      <AmbientMoodTint />
      
      <div className="py-6 space-y-8">
        {/* Greeting and Streak */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl font-display font-bold text-deepSage">
            {getGreeting()}
          </h1>
          {profile && profile.streak_count > 0 && (
            <motion.div
              className="inline-flex items-center space-x-2 px-4 py-2 bg-cosmic-gradient rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <span className="text-sm font-medium text-deepSage">
                🔥 {t('home.streakMessage', { count: profile.streak_count })}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* First-time user empty state or Mood Orb */}
        {isFirstTime ? (
          <motion.div
            className="flex flex-col items-center justify-center py-12 px-6 space-y-6 rounded-xl bg-gradient-to-br from-teal/5 via-sage/5 to-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-teal/20 to-sage/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <svg className="w-12 h-12 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <circle cx="12" cy="12" r="5" fill="currentColor" opacity={0.3} />
                </svg>
              </motion.div>
            </motion.div>
            
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-display font-bold text-deepSage">
                {t('home.firstTimeTitle', { defaultValue: 'Your journey starts here' })}
              </h2>
              <p className="text-textSecondaryLight max-w-md">
                {t('home.firstTimeDescription', { 
                  defaultValue: "Check in with how you're feeling. Over time, you'll see your emotional patterns and get personalized program suggestions." 
                })}
              </p>
            </div>
            
            <motion.button
              onClick={() => setCheckInOpen(true)}
              className="cosmic-button inline-flex items-center space-x-2 px-6 py-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{t('home.doFirstCheckIn', { defaultValue: 'Do Your First Check-In' })}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </motion.button>
          </motion.div>
        ) : showMilestoneOrb && profile ? (
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
          >
            <MilestoneOrb 
              streakCount={profile.streak_count}
              size={250}
              onComplete={() => setShowMilestoneOrb(false)}
            />
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-center space-y-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
          >
            <div className="relative">
              <GradientMoodOrb
                ref={orbRef}
                size={220}
                onClick={() => setCheckInOpen(true)}
                className="drop-shadow-lg"
                streak={profile?.streak_count}
              />
              
              {/* Export button - only show when user has data */}
              {summary && summary.daysWithData > 0 && (
                <motion.button
                  onClick={() => setExportModalOpen(true)}
                  className="absolute -bottom-2 -right-2 p-2 bg-teal text-white rounded-full shadow-lg hover:bg-teal/90 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Export mood orb as image"
                >
                  <Download className="w-4 h-4" />
                </motion.button>
              )}
            </div>
            
            {/* Last updated timestamp */}
            <OrbTimestamp lastUpdated={lastCheckIn?.timestamp || null} />
            
            <div className="text-center space-y-2">
              {hasCheckedInToday() ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-deepSage">
                    {t('home.weekAtAGlance')}
                  </p>
                  <p className="text-xs text-textSecondaryLight">
                    {t('home.tapToCheckIn')}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-deepSage">
                    {t('home.howAreYouFeeling')}
                  </p>
                  <p className="text-xs text-textSecondaryLight">
                    {t('home.tapToCheckIn')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Daily Quote Card - Only show if opted in */}
        {privacyConsents.dailyQuotes && user && (
          <QuoteCard className="mb-6" />
        )}

        {/* Streak Perks - Show for users with 7+ day streaks */}
        {profile && profile.streak_count >= 7 && (
          <StreakPerks streakCount={profile.streak_count} className="mb-6" />
        )}

        {/* Quick Stats */}
        {lastCheckIn && (
          <motion.div
            className="cosmic-card p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h3 className="font-semibold text-deepSage mb-3">{t('home.recentCheckIn')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-textSecondaryLight">{t('home.moodLevel')}</span>
                <span className="text-sm font-medium text-deepSage">
                  {lastCheckIn.moodLevel16}/6
                </span>
              </div>
              {lastCheckIn.affectTags && lastCheckIn.affectTags.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm text-textSecondaryLight">{t('home.feelings')}</span>
                  <div className="flex flex-wrap gap-1">
                    {lastCheckIn.affectTags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-teal/10 text-teal rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {lastCheckIn.affectTags.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-sage/10 text-sageText rounded-full">
                        {t('home.moreItems', { count: lastCheckIn.affectTags.length - 3 })}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {lastCheckIn.note && (
                <div className="space-y-1">
                  <span className="text-sm text-textSecondaryLight">{t('home.note')}</span>
                  <p className="text-sm text-deepSage italic">
                    "{lastCheckIn.note}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            <MyNextThing />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <QuickActions />
        </motion.div>

        {/* XiPWidget removed per pilot lockdown (Prompt 1). */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <SuggestedPrograms />
        </motion.div>

        {/* Personalized Program Recommendations */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <ForYouRecommendations />
          </motion.div>
        )}

        {/* Spacer for floating dock */}
        <div className="h-32" />
      </div>

      {/* Check-in Form */}
      <CheckInForm
        isOpen={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        onSuccess={handleCheckInSuccess}
      />

      {/* Ximi Dock - Floating AI assistant (authenticated users only) */}
      {user && <XimiDock onCrisis={() => setCrisisOpen(true)} />}

      {/* Crisis Support Sheet */}
      <CrisisSheet open={crisisOpen} onClose={() => setCrisisOpen(false)} />
      
      {/* Orb Export Modal */}
      <OrbExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onConfirmExport={handleExportOrb}
      />
    </>
  );
}
