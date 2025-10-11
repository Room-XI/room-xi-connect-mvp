import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, TrendingUp, Calendar, QrCode, UserCheck, ExternalLink } from 'lucide-react';
import Sparkline from '@/ui/me/Sparkline';
import { supabase } from '@/lib/supabase';
import { getAttendanceHistory, getAttendanceCount } from '@/lib/attendance';
import { useAuth } from '@/lib/session';
import { useQueue } from '@/lib/queue';

interface CheckIn {
  id: string;
  timestamp: string;
  mood_level_1_6: number;
  affect_tags: string[];
  note: string | null;
}

interface AttendanceRecord {
  id: string;
  timestamp: string;
  method: 'qr' | 'manual';
  site: string | null;
  programs: {
    id: string;
    title: string;
    organizer: string | null;
    location_name: string | null;
  } | null;
}

interface Profile {
  streak_count: number;
  last_checkin_date: string | null;
}

export default function Me() {
  const { user } = useAuth();
  const { itemCount } = useQueue();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
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
      
      // Load recent check-ins for sparkline
      const { data: checkInData } = await supabase
        .from('checkins')
        .select('id, timestamp, mood_level_1_6, affect_tags, note')
        .eq('user_id', user!.id)
        .order('timestamp', { ascending: false })
        .limit(30); // Last 30 check-ins for sparkline

      if (checkInData) {
        setCheckIns(checkInData);
      }

      // Load attendance history
      const attendanceData = await getAttendanceHistory();
      setAttendance(attendanceData);

      // Load total attendance count
      const count = await getAttendanceCount();
      setAttendanceCount(count);

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

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-CA', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown time';
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-sage/10 rounded w-32 animate-pulse" />
          <div className="w-10 h-10 bg-sage/10 rounded-lg animate-pulse" />
        </div>
        
        {[...Array(3)].map((_, i) => (
          <div key={i} className="cosmic-card p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-5 bg-sage/10 rounded" />
              <div className="h-20 bg-sage/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-display font-bold text-deepSage">
          Your Journey
        </h1>
        
        <div className="flex items-center space-x-3">
          {/* Offline indicator (Fix for R-03: Inadequate Offline Feedback) */}
          {itemCount > 0 && (
            <motion.div
              className="flex items-center space-x-2 px-3 py-2 bg-sage/10 rounded-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="w-2 h-2 bg-coral rounded-full animate-pulse" />
              <span className="text-xs font-medium text-sage">
                {itemCount} item{itemCount !== 1 ? 's' : ''} syncing
              </span>
            </motion.div>
          )}
          
          <Link to="/settings">
            <motion.div
              className="w-10 h-10 bg-sage/10 rounded-lg flex items-center justify-center hover:bg-sage/20 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5 text-sage" />
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        <div className="cosmic-card p-4 text-center">
          <div className="text-2xl font-bold text-teal">
            {profile?.streak_count || 0}
          </div>
          <div className="text-sm text-textSecondaryLight">
            Day streak
          </div>
        </div>
        
        <div className="cosmic-card p-4 text-center">
          <div className="text-2xl font-bold text-gold">
            {attendanceCount}
          </div>
          <div className="text-sm text-textSecondaryLight">
            Programs attended
          </div>
        </div>
      </motion.div>

      {/* Mood History */}
      <motion.div
        className="cosmic-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-teal" />
          <h2 className="text-lg font-semibold text-deepSage">Mood History</h2>
        </div>
        
        {checkIns.length > 0 ? (
          <div className="space-y-3">
            <Sparkline data={checkIns} />
            <p className="text-sm text-textSecondaryLight">
              Your mood journey over the last {checkIns.length} check-ins
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-textSecondaryLight">
              No check-ins yet. Start tracking your mood to see your journey!
            </p>
            <Link
              to="/home"
              className="inline-block mt-3 text-sm font-medium text-teal hover:text-teal/80 transition-colors"
            >
              Check in now →
            </Link>
          </div>
        )}
      </motion.div>

      {/* Recent Attendance */}
      <motion.div
        className="cosmic-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gold" />
            <h2 className="text-lg font-semibold text-deepSage">Recent Attendance</h2>
          </div>
          
          {attendance.length > 5 && (
            <button className="text-sm font-medium text-teal hover:text-teal/80 transition-colors">
              View all
            </button>
          )}
        </div>
        
        {attendance.length > 0 ? (
          <div className="space-y-3">
            {attendance.slice(0, 5).map((record, index) => (
              <motion.div
                key={record.id}
                className="flex items-center justify-between p-3 bg-surface rounded-lg border border-borderMutedLight/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    record.method === 'qr' 
                      ? 'bg-teal/10 text-teal' 
                      : 'bg-gold/10 text-gold'
                  }`}>
                    {record.method === 'qr' ? (
                      <QrCode className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium text-deepSage">
                      {record.programs?.title || 'Unknown Program'}
                    </div>
                    <div className="text-xs text-textSecondaryLight">
                      {formatDate(record.timestamp)} at {formatTime(record.timestamp)}
                      {record.programs?.organizer && ` • ${record.programs.organizer}`}
                    </div>
                  </div>
                </div>
                
                {record.programs && (
                  <Link
                    to={`/program/${record.programs.id}`}
                    className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-textSecondaryLight" />
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-textSecondaryLight">
              No program attendance yet. Scan QR codes to track your participation!
            </p>
            <Link
              to="/qr"
              className="inline-block mt-3 text-sm font-medium text-teal hover:text-teal/80 transition-colors"
            >
              Scan QR code →
            </Link>
          </div>
        )}
      </motion.div>

      {/* Offline Status */}
      {!navigator.onLine && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-4 bg-sage/10 border-sage/20"
        >
          <p className="text-sm text-sage text-center">
            You're offline. Some data may not be up to date.
          </p>
        </motion.div>
      )}
    </div>
  );
}
