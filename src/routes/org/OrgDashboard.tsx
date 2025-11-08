import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Heart, 
  BarChart3,
  Download,
  ArrowLeft 
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { getMoodByScore } from '@/lib/moodConfig';

interface DashboardStats {
  totalYouth: number;
  activeYouth: number; // Checked in last 30 days
  totalPrograms: number;
  totalAttendance: number;
  avgMoodScore: number;
  moodDistribution: Record<string, number>;
  programEngagement: Array<{
    programId: string;
    programTitle: string;
    attendanceCount: number;
  }>;
}

export default function OrgDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'all'>('30days');

  useEffect(() => {
    loadDashboardStats();
  }, [timeRange]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.org.getDashboardStats(timeRange);
      
      if (error) {
        console.error('Error loading dashboard stats:', error);
        return;
      }
      
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Unexpected error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const { data, error } = await api.org.exportReport(timeRange);
      
      if (error) {
        console.error('Error exporting report:', error);
        return;
      }
      
      // Trigger download
      if (data && data.csv) {
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `room-xi-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Unexpected error exporting report:', err);
    }
  };

  const avgMood = stats ? getMoodByScore(Math.round(stats.avgMoodScore)) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/home" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Organization Dashboard</h1>
              <p className="text-gray-600">Monitor program engagement and youth wellness at a glance</p>
            </div>
            
            <button
              onClick={exportReport}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="bg-white rounded-xl shadow-md p-2 mb-8 inline-flex gap-2">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '7days'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '30days'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Time
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">Active Youth</h3>
                <p className="text-4xl font-bold text-gray-900">{stats.activeYouth}</p>
                <p className="text-sm text-gray-500 mt-1">of {stats.totalYouth} total</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">Total Programs</h3>
                <p className="text-4xl font-bold text-gray-900">{stats.totalPrograms}</p>
                <Link to="/org/programs" className="text-sm text-purple-600 hover:underline mt-1 inline-block">
                  Manage programs →
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">Total Attendance</h3>
                <p className="text-4xl font-bold text-gray-900">{stats.totalAttendance}</p>
                <p className="text-sm text-gray-500 mt-1">QR check-ins</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-pink-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">Average Mood</h3>
                {avgMood ? (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{avgMood.emoji}</span>
                    <p className="text-2xl font-bold text-gray-900">{avgMood.label}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data</p>
                )}
                <p className="text-sm text-gray-500 mt-1">Aggregate wellness</p>
              </motion.div>
            </div>

            {/* Mood Distribution Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Mood Distribution</h2>
              
              {Object.keys(stats.moodDistribution).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(stats.moodDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([moodLabel, count]) => {
                      const mood = [1, 2, 3, 4, 5, 6]
                        .map(score => getMoodByScore(score))
                        .find(m => m.label === moodLabel);
                      
                      if (!mood) return null;
                      
                      const total = Object.values(stats.moodDistribution).reduce((sum, c) => sum + c, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      
                      return (
                        <div key={moodLabel} className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-32">
                            <span className="text-2xl">{mood.emoji}</span>
                            <span className="text-sm font-medium text-gray-700">{mood.label}</span>
                          </div>
                          <div className="flex-1">
                            <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="h-full rounded-full"
                                style={{
                                  backgroundColor: `hsl(${mood.color.h}, ${mood.color.s}%, ${mood.color.l}%)`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No mood data available for this time range.</p>
              )}
            </div>

            {/* Program Engagement */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Program Engagement</h2>
              
              {stats.programEngagement.length > 0 ? (
                <div className="space-y-3">
                  {stats.programEngagement.map((program, index) => (
                    <motion.div
                      key={program.programId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{program.programTitle}</h3>
                          <p className="text-sm text-gray-500">{program.attendanceCount} check-ins</p>
                        </div>
                      </div>
                      <Link
                        to={`/program/${program.programId}`}
                        className="text-indigo-600 hover:underline text-sm font-medium"
                      >
                        View details →
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No program attendance data for this time range.</p>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Privacy Protection</h3>
              <p className="text-sm text-gray-700">
                All data displayed is aggregated and anonymized. Individual youth cannot be identified from this dashboard.
                Only youth who have consented to data sharing contribute to these metrics.
              </p>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">
              Dashboard stats will appear here once youth start using the platform.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
