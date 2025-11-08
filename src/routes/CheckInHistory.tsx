import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, TrendingUp, Heart, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { getMoodByScore } from '@/lib/moodConfig';
import { DateTime } from 'luxon';

interface CheckIn {
  id: string;
  moodLevel16: number;
  wellnessDimensions?: string[];
  note?: string;
  timestamp: string;
  checkinDate: string;
}

export default function CheckInHistory() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '7days' | '30days'>('30days');

  useEffect(() => {
    loadCheckIns();
  }, []);

  const loadCheckIns = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.checkins.list();
      
      if (error) {
        console.error('Error loading check-ins:', error);
        return;
      }
      
      if (data && Array.isArray(data)) {
        setCheckIns(data);
      }
    } catch (err) {
      console.error('Unexpected error loading check-ins:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCheckIns = () => {
    if (filter === 'all') return checkIns;
    
    const now = DateTime.now();
    const days = filter === '7days' ? 7 : 30;
    const cutoff = now.minus({ days }).toJSDate();
    
    return checkIns.filter(c => new Date(c.timestamp) >= cutoff);
  };

  const filteredCheckIns = getFilteredCheckIns();

  // Calculate average mood
  const avgMood = filteredCheckIns.length > 0
    ? Math.round(filteredCheckIns.reduce((sum, c) => sum + c.moodLevel16, 0) / filteredCheckIns.length)
    : 0;

  const avgMoodConfig = avgMood > 0 ? getMoodByScore(avgMood) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/home" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Check-In History</h1>
              <p className="text-gray-600">Your emotional journey at a glance</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Check-Ins</span>
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{filteredCheckIns.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Average Mood</span>
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div className="flex items-center gap-2">
              {avgMoodConfig ? (
                <>
                  <span className="text-2xl">{avgMoodConfig.emoji}</span>
                  <p className="text-xl font-bold text-gray-900">{avgMoodConfig.label}</p>
                </>
              ) : (
                <p className="text-gray-500">No data yet</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Current Streak</span>
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {/* TODO: Calculate actual streak */}
              🔥 0 days
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-md p-2 mb-6 flex gap-2">
          <button
            onClick={() => setFilter('7days')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === '7days'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setFilter('30days')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === '30days'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Check-In Timeline */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCheckIns.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Check-Ins Yet</h3>
              <p className="text-gray-600 mb-6">
                Start tracking your emotional journey by completing your first check-in.
              </p>
              <Link
                to="/home"
                className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-semibold"
              >
                Check In Now
              </Link>
            </div>
          ) : (
            filteredCheckIns.map((checkIn, index) => {
              const mood = getMoodByScore(checkIn.moodLevel16);
              const date = DateTime.fromISO(checkIn.timestamp);
              const isToday = date.hasSame(DateTime.now(), 'day');
              const isYesterday = date.hasSame(DateTime.now().minus({ days: 1 }), 'day');
              
              let dateLabel = date.toFormat('MMMM d, yyyy');
              if (isToday) dateLabel = `Today, ${date.toFormat('h:mm a')}`;
              else if (isYesterday) dateLabel = `Yesterday, ${date.toFormat('h:mm a')}`;
              else dateLabel = date.toFormat('MMMM d, h:mm a');

              return (
                <motion.div
                  key={checkIn.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                        style={{
                          backgroundColor: mood ? `hsl(${mood.color.h}, ${mood.color.s}%, ${mood.color.l}%, 0.2)` : '#f3f4f6',
                        }}
                      >
                        {mood?.emoji}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{mood?.label}</h3>
                        <p className="text-sm text-gray-500">{dateLabel}</p>
                      </div>
                    </div>
                  </div>

                  {checkIn.wellnessDimensions && checkIn.wellnessDimensions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Wellness Check:</p>
                      <div className="flex flex-wrap gap-2">
                        {checkIn.wellnessDimensions.map((dimension) => (
                          <span
                            key={dimension}
                            className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium"
                          >
                            {dimension}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {checkIn.note && (
                    <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-teal-600">
                      <p className="text-sm text-gray-700 italic">"{checkIn.note}"</p>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
