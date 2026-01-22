import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  ArrowLeft, 
  Loader, 
  Shield, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Activity,
  Sparkles,
  Lock
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ConsentStatusBadge } from '@/components/ConsentStatusBadge';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface ConsentLevel {
  share_mood_timeline?: boolean;
  share_program_engagement?: boolean;
  share_checkin_streak?: boolean;
}

interface YouthProfile {
  id: string;
  displayName: string;
  consentStatus: 'granted' | 'pending' | 'denied' | 'revoked';
  consentLevel: ConsentLevel;
  moodTimeline?: {
    checkins: Array<{
      date: string;
      moodLevel: number;
      moodType: string | null;
    }>;
    averageMood: number | null;
    totalCheckins: number;
  };
  programEngagement?: {
    programsAttended: number;
    totalAttendance: number;
    recentPrograms: string[];
  };
  checkinStreak?: {
    currentStreak: number;
    longestStreak: number;
    lastCheckinDate: string | null;
  };
}

interface AISummary {
  summary: string;
}

export default function YouthProfileView() {
  const { youthId } = useParams<{ youthId: string }>();
  const [profile, setProfile] = useState<YouthProfile | null>(null);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (youthId) {
      loadYouthProfile();
    }
  }, [youthId]);

  async function loadYouthProfile() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/youth-workers/youth/${youthId}`, {
        credentials: 'include',
      });

      if (response.status === 403) {
        setError('You do not have consent to view this youth\'s data.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load youth profile');
      }

      const data = await response.json();
      setProfile(data);

      if (data.consentLevel?.share_mood_timeline) {
        loadAiSummary();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAiSummary() {
    try {
      setAiLoading(true);
      setAiError(null);

      const response = await fetch(`/api/ai/summary/${youthId}`, {
        credentials: 'include',
      });

      if (response.status === 403) {
        setAiError('Youth has not consented to mood timeline sharing.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load AI summary');
      }

      const data = await response.json();
      setAiSummary(data);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream p-4">
        <div className="max-w-2xl mx-auto">
          <Link 
            to="/youth-worker/dashboard"
            className="inline-flex items-center gap-2 text-textSecondaryLight hover:text-deepSage mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="bg-coral/10 border border-coral/30 rounded-xl p-6 text-center">
            <Lock className="w-12 h-12 text-coral mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-coral mb-2">Access Denied</h2>
            <p className="text-coral/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = profile?.moodTimeline?.checkins
    ?.slice()
    .reverse()
    .map((checkin, index) => ({
      index,
      mood: checkin.moodLevel,
      date: new Date(checkin.date).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      }),
    })) || [];

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link 
            to="/youth-worker/dashboard"
            className="inline-flex items-center gap-2 text-textSecondaryLight hover:text-deepSage"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-teal" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-deepSage">
                  {profile?.displayName || 'Youth Profile'}
                </h1>
                <p className="text-textSecondaryLight">Youth ID: {youthId?.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          <ConsentStatusBadge 
            consentLevel={profile?.consentLevel} 
            consentStatus={profile?.consentStatus || 'pending'}
            showDetails
          />
        </motion.div>

        {profile?.consentLevel?.share_mood_timeline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-teal" />
              <h2 className="text-lg font-display font-semibold text-deepSage">
                Mood Timeline
              </h2>
            </div>

            {chartData.length > 0 ? (
              <div className="space-y-4">
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: '#7B8F89' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="mood"
                        stroke="#147A4D"
                        strokeWidth={2}
                        dot={{ fill: '#147A4D', strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5, fill: '#147A4D', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
                                <p className="text-sm font-medium text-deepSage">Mood: {data.mood}/6</p>
                                <p className="text-xs text-textSecondaryLight">{data.date}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-sage/10 rounded-lg p-3">
                    <p className="text-2xl font-bold text-deepSage">
                      {profile?.moodTimeline?.totalCheckins || 0}
                    </p>
                    <p className="text-xs text-textSecondaryLight">Total Check-ins</p>
                  </div>
                  <div className="bg-sage/10 rounded-lg p-3">
                    <p className="text-2xl font-bold text-deepSage">
                      {profile?.moodTimeline?.averageMood?.toFixed(1) || '-'}
                    </p>
                    <p className="text-xs text-textSecondaryLight">Avg Mood</p>
                  </div>
                  <div className="bg-sage/10 rounded-lg p-3">
                    <p className="text-2xl font-bold text-deepSage">
                      {chartData.length}
                    </p>
                    <p className="text-xs text-textSecondaryLight">Recent</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-textSecondaryLight text-center py-4">
                No mood data available
              </p>
            )}
          </motion.div>
        )}

        {profile?.consentLevel?.share_mood_timeline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-teal" />
              <h2 className="text-lg font-display font-semibold text-deepSage">
                AI Journal Summary
              </h2>
            </div>

            {aiLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-teal animate-spin" />
              </div>
            ) : aiError ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 text-sm">{aiError}</p>
              </div>
            ) : aiSummary ? (
              <div className="bg-cosmic-gradient rounded-lg p-4">
                <p className="text-deepSage whitespace-pre-wrap">{aiSummary.summary}</p>
              </div>
            ) : (
              <p className="text-textSecondaryLight text-center py-4">
                No AI summary available
              </p>
            )}
          </motion.div>
        )}

        {profile?.consentLevel?.share_program_engagement && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-teal" />
              <h2 className="text-lg font-display font-semibold text-deepSage">
                Program Engagement
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-sage/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-deepSage">
                  {profile?.programEngagement?.programsAttended || 0}
                </p>
                <p className="text-sm text-textSecondaryLight">Programs Attended</p>
              </div>
              <div className="bg-sage/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-deepSage">
                  {profile?.programEngagement?.totalAttendance || 0}
                </p>
                <p className="text-sm text-textSecondaryLight">Total Attendance</p>
              </div>
            </div>
          </motion.div>
        )}

        {profile?.consentLevel?.share_checkin_streak && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-gray-100 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-teal" />
              <h2 className="text-lg font-display font-semibold text-deepSage">
                Check-in Streak
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-teal/10 rounded-lg p-4">
                <p className="text-3xl font-bold text-teal">
                  {profile?.checkinStreak?.currentStreak || 0}
                </p>
                <p className="text-sm text-textSecondaryLight">Current Streak</p>
              </div>
              <div className="bg-sage/10 rounded-lg p-4">
                <p className="text-3xl font-bold text-deepSage">
                  {profile?.checkinStreak?.longestStreak || 0}
                </p>
                <p className="text-sm text-textSecondaryLight">Longest Streak</p>
              </div>
              <div className="bg-sage/10 rounded-lg p-4">
                <p className="text-sm font-medium text-deepSage">
                  {profile?.checkinStreak?.lastCheckinDate 
                    ? new Date(profile.checkinStreak.lastCheckinDate).toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-'
                  }
                </p>
                <p className="text-sm text-textSecondaryLight">Last Check-in</p>
              </div>
            </div>
          </motion.div>
        )}

        {!profile?.consentLevel?.share_mood_timeline && 
         !profile?.consentLevel?.share_program_engagement && 
         !profile?.consentLevel?.share_checkin_streak && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <Shield className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <h3 className="font-semibold text-amber-800 mb-2">Limited Access</h3>
            <p className="text-amber-700 text-sm">
              This youth has not shared any data categories with you yet.
              Please wait for them to grant additional consent permissions.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
