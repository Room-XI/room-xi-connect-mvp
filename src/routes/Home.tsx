import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MoodOrb from '@/ui/home/MoodOrb';
import CheckInForm from '@/ui/home/CheckInForm';
import SuggestedPrograms from '@/ui/home/SuggestedPrograms';
import QuickActions from '@/ui/home/QuickActions';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/session';

interface CheckIn {
  id: string;
  timestamp: string;
  mood_level_1_6: number;
  affect_tags: string[];
  note: string | null;
}

interface Profile {
  streak_count: number;
  last_checkin_date: string | null;
}

export default function Home() {
  const { user } = useAuth();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<CheckIn | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load last check-in
      const { data: checkInData } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', user!.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (checkInData) {
        setLastCheckIn(checkInData);
      }

      // Load profile for streak info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('streak_count, last_checkin_date')
        .eq('user_id', user!.id)
        .single();

      if (profileData) {
        setProfile(profileData);
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
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
          <div className="w-48 h-48 mx-auto bg-sage/10 rounded-full animate-pulse" />
          <div className="h-6 bg-sage/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="py-6 space-y-8">
        {/* Greeting and Streak */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl font-display font-bold text-deepSage">
            {getGreeting()}!
          </h1>
          {profile && profile.streak_count > 0 && (
            <motion.div
              className="inline-flex items-center space-x-2 px-4 py-2 bg-cosmic-gradient rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <span className="text-sm font-medium text-deepSage">
                🔥 {profile.streak_count} day streak
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Mood Orb - Central Feature */}
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
        >
          <MoodOrb
            size={200}
            mood={lastCheckIn?.mood_level_1_6}
            onClick={() => setCheckInOpen(true)}
            className="drop-shadow-lg"
          />
          
          <div className="text-center space-y-2">
            {hasCheckedInToday() ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-deepSage">
                  You checked in today
                </p>
                <p className="text-xs text-textSecondaryLight">
                  Tap the orb to update your mood
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-deepSage">
                  How are you feeling today?
                </p>
                <p className="text-xs text-textSecondaryLight">
                  Tap the orb to check in
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        {lastCheckIn && (
          <motion.div
            className="cosmic-card p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h3 className="font-semibold text-deepSage mb-3">Recent Check-in</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-textSecondaryLight">Mood Level</span>
                <span className="text-sm font-medium text-deepSage">
                  {lastCheckIn.mood_level_1_6}/6
                </span>
              </div>
              {lastCheckIn.affect_tags.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm text-textSecondaryLight">Feelings</span>
                  <div className="flex flex-wrap gap-1">
                    {lastCheckIn.affect_tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-teal/10 text-teal rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {lastCheckIn.affect_tags.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full">
                        +{lastCheckIn.affect_tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              {lastCheckIn.note && (
                <div className="space-y-1">
                  <span className="text-sm text-textSecondaryLight">Note</span>
                  <p className="text-sm text-deepSage italic">
                    "{lastCheckIn.note}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <QuickActions />
        </motion.div>

        {/* Suggested Programs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <SuggestedPrograms />
        </motion.div>
      </div>

      {/* Check-in Form */}
      <CheckInForm
        isOpen={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        onSuccess={handleCheckInSuccess}
      />
    </>
  );
}
