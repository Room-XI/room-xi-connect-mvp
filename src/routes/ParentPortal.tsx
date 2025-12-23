import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Shield, 
  LogOut, 
  Loader, 
  Heart, 
  EyeOff, 
  Calendar, 
  MapPin,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import ParentConsentManager from '@/components/ParentConsentManager';

interface PrivacySettings {
  moodVisible: boolean;
  attendanceVisible: boolean;
  demographicsVisible: boolean;
  ximiChatsVisible: boolean;
}

interface MoodData {
  recentCheckins: Array<{
    date: string;
    moodLevel: number;
    moodType: string | null;
  }>;
  totalCheckins: number;
  averageMood: number | null;
  currentMood: string | null;
  streakCount: number;
  lastCheckinDate: string | null;
}

interface AttendanceRecord {
  programId: string;
  programTitle: string;
  organizer: string | null;
  timestamp: string;
  method: string;
}

interface AttendanceData {
  records: AttendanceRecord[];
  totalAttendance: number;
  hiddenProgramCount: number;
}

interface YouthProfile {
  firstName: string | null;
  preferredName: string | null;
  age: number | null;
  city: string | null;
}

interface YouthData {
  youthId: string;
  relation: string;
  verifiedAt: string;
  profile: YouthProfile;
  privacySettings: PrivacySettings;
  moodData: MoodData | null;
  attendanceData: AttendanceData | null;
  demographicsData: any | null;
  hiddenCategories: string[];
}

interface LinkedYouth {
  userId: string;
  relation: string;
  verifiedAt: string | null;
  preferredName: string | null;
  firstName: string | null;
  age: number | null;
}

const MOOD_LABELS: Record<string, string> = {
  cold: 'Low Energy',
  stormy: 'Challenging',
  foggy: 'Uncertain',
  clear: 'Balanced',
  breezy: 'Positive',
  aurora: 'Thriving'
};

export default function ParentPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linkedYouth, setLinkedYouth] = useState<LinkedYouth[]>([]);
  const [selectedYouth, setSelectedYouth] = useState<string | null>(null);
  const [youthData, setYouthData] = useState<YouthData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mood: true,
    attendance: true,
    privacy: true
  });

  useEffect(() => {
    loadParentStatus();
  }, []);

  useEffect(() => {
    if (selectedYouth) {
      loadYouthData(selectedYouth);
    }
  }, [selectedYouth]);

  const loadParentStatus = async () => {
    try {
      setLoading(true);
      const { data, error: apiError } = await api.parentAuth.getStatus();

      if (apiError) {
        throw new Error(apiError);
      }

      if (data?.linkedYouth) {
        setLinkedYouth(data.linkedYouth);
        if (data.linkedYouth.length > 0) {
          setSelectedYouth(data.linkedYouth[0].userId);
        }
      }
    } catch (err: any) {
      console.error('Failed to load parent status:', err);
      setError(err.message || 'Failed to load youth information');
      
      if (err.message?.includes('401') || err.message?.includes('authentication')) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadYouthData = async (youthId: string) => {
    try {
      setLoadingData(true);
      const { data, error: apiError } = await api.parentPortal.getYouthData(youthId);

      if (apiError) {
        throw new Error(apiError);
      }

      if (data) {
        setYouthData(data);
      }
    } catch (err: any) {
      console.error('Failed to load youth data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.parentAuth.logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-teal" />
      </div>
    );
  }

  if (error || linkedYouth.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cosmic-card p-8 max-w-md text-center space-y-4"
        >
          <Shield className="w-12 h-12 text-coral mx-auto" />
          <h2 className="text-2xl font-display font-bold text-deepSage">
            No Linked Youth
          </h2>
          <p className="text-textSecondaryLight">
            {error || 'You do not have any linked youth accounts. Please accept an invitation from a youth to get started.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  const selectedYouthBasic = linkedYouth.find((y) => y.userId === selectedYouth);
  const youthName = youthData?.profile?.preferredName || youthData?.profile?.firstName || selectedYouthBasic?.preferredName || selectedYouthBasic?.firstName || 'Youth';

  return (
    <div className="min-h-screen bg-gradient-cosmic">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-teal/10 rounded-lg">
                <Shield className="w-6 h-6 text-teal" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-deepSage">
                  Parent Portal
                </h1>
                <p className="text-sm text-textSecondaryLight">
                  View your youth's shared data and manage consent
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-coral/10 text-coral rounded-lg hover:bg-coral/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </motion.div>

        {linkedYouth.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="cosmic-card p-4 mb-6"
          >
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-4 h-4 text-teal" />
              <span className="text-sm font-medium text-deepSage">Select Youth</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {linkedYouth.map((youth) => (
                <button
                  key={youth.userId}
                  onClick={() => setSelectedYouth(youth.userId)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedYouth === youth.userId
                      ? 'bg-teal text-white'
                      : 'bg-sage/10 text-deepSage hover:bg-sage/20'
                  }`}
                >
                  {youth.preferredName || youth.firstName || 'Youth'}
                  {youth.age && ` (${youth.age})`}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {selectedYouthBasic && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="cosmic-card p-6 mb-6"
          >
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gold/10 rounded-lg">
                <Heart className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-deepSage">{youthName}</h2>
                <p className="text-sm text-textSecondaryLight">
                  {selectedYouthBasic.relation === 'guardian' ? 'Guardian' : 'Parent'} •
                  Linked {selectedYouthBasic.verifiedAt && new Date(selectedYouthBasic.verifiedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-teal" />
            <span className="ml-2 text-textSecondaryLight">Loading data...</span>
          </div>
        ) : youthData && (
          <>
            {youthData.hiddenCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
              >
                <div className="flex items-start gap-3">
                  <EyeOff className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-amber-900">Some Information is Private</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      {youthName} has chosen to keep some information private. This is their right under our privacy-first approach.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {youthData.hiddenCategories.includes('mood') && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          Mood Data Hidden
                        </span>
                      )}
                      {youthData.hiddenCategories.includes('attendance') && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          Attendance Hidden
                        </span>
                      )}
                      {youthData.hiddenCategories.includes('demographics') && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          Demographics Hidden
                        </span>
                      )}
                      {youthData.hiddenCategories.includes('ximiChats') && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          AI Conversations Hidden
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {youthData.moodData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="cosmic-card mb-6 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection('mood')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-sage/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 rounded-lg">
                      <Heart className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deepSage">Mood & Wellness</h3>
                      <p className="text-sm text-textSecondaryLight">
                        {youthData.moodData.totalCheckins} check-ins • {youthData.moodData.streakCount} day streak
                      </p>
                    </div>
                  </div>
                  {expandedSections.mood ? (
                    <ChevronUp className="w-5 h-5 text-textSecondaryLight" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-textSecondaryLight" />
                  )}
                </button>

                {expandedSections.mood && (
                  <div className="px-4 pb-4 border-t border-sage/10">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-sage/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-teal" />
                          <span className="text-sm font-medium text-deepSage">Average Mood</span>
                        </div>
                        <p className="text-2xl font-bold text-teal">
                          {youthData.moodData.averageMood?.toFixed(1) || '--'}/6
                        </p>
                      </div>
                      <div className="bg-sage/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-teal" />
                          <span className="text-sm font-medium text-deepSage">Current Mood</span>
                        </div>
                        <p className="text-lg font-semibold text-deepSage">
                          {youthData.moodData.currentMood 
                            ? MOOD_LABELS[youthData.moodData.currentMood] || youthData.moodData.currentMood
                            : 'Not set'}
                        </p>
                      </div>
                    </div>

                    {youthData.moodData.recentCheckins.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-textSecondaryLight mb-2">Recent Check-ins</h4>
                        <div className="space-y-2">
                          {youthData.moodData.recentCheckins.slice(0, 7).map((checkin, idx) => (
                            <div key={idx} className="flex items-center justify-between py-2 border-b border-sage/10 last:border-0">
                              <span className="text-sm text-textSecondaryLight">
                                {new Date(checkin.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-deepSage">
                                  {checkin.moodType ? MOOD_LABELS[checkin.moodType] || checkin.moodType : `Level ${checkin.moodLevel}`}
                                </span>
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ 
                                    backgroundColor: `hsl(${(checkin.moodLevel / 6) * 120}, 70%, 50%)`
                                  }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {youthData.attendanceData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="cosmic-card mb-6 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection('attendance')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-sage/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deepSage">Program Attendance</h3>
                      <p className="text-sm text-textSecondaryLight">
                        {youthData.attendanceData.totalAttendance} program visits
                        {youthData.attendanceData.hiddenProgramCount > 0 && (
                          <span className="text-amber-600"> • {youthData.attendanceData.hiddenProgramCount} hidden</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {expandedSections.attendance ? (
                    <ChevronUp className="w-5 h-5 text-textSecondaryLight" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-textSecondaryLight" />
                  )}
                </button>

                {expandedSections.attendance && (
                  <div className="px-4 pb-4 border-t border-sage/10">
                    {youthData.attendanceData.records.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {youthData.attendanceData.records.slice(0, 10).map((record, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-sage/10 last:border-0">
                            <div>
                              <p className="font-medium text-deepSage">{record.programTitle || 'Unknown Program'}</p>
                              <p className="text-sm text-textSecondaryLight">{record.organizer || 'Unknown organizer'}</p>
                            </div>
                            <span className="text-sm text-textSecondaryLight">
                              {new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 text-center py-6 text-textSecondaryLight">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No program attendance recorded yet</p>
                      </div>
                    )}

                    {youthData.attendanceData.hiddenProgramCount > 0 && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-amber-700 text-sm">
                          <EyeOff className="w-4 h-4" />
                          <span>{youthName} has hidden {youthData.attendanceData.hiddenProgramCount} program(s) from this view</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {!youthData.privacySettings.moodVisible && !youthData.privacySettings.attendanceVisible && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="cosmic-card p-6 mb-6 text-center"
              >
                <EyeOff className="w-12 h-12 text-textSecondaryLight mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-deepSage mb-2">Data is Private</h3>
                <p className="text-textSecondaryLight">
                  {youthName} has chosen to keep their data private at this time.
                  This is their right under our privacy-first approach.
                </p>
              </motion.div>
            )}
          </>
        )}

        {selectedYouth && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <ParentConsentManager userId={selectedYouth} youthName={youthName} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Privacy-First Approach</h4>
              <p className="text-sm text-blue-700 mt-1">
                Room XI Connect gives youth control over their privacy. They can choose what to share with you.
                This helps build trust and encourages honest self-reflection.
                If you have concerns about your youth's wellbeing, we encourage open conversations.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
