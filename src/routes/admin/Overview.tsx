import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building,
  Activity,
  Calendar,
  MessageSquare,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface AdminStats {
  totalUsers: number;
  totalCheckins: number;
  activeUsers: number;
  totalPrograms: number;
  totalAttendance: number;
  ximiConversationsCount: number;
  crisisFlagsCount: number;
  crisisResolutionRate: number;
  avgDailyCheckins: number;
  userGrowth: Array<{ date: string; count: number }>;
  checkinTrends: Array<{ date: string; count: number }>;
}

export default function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data, error: apiError } = await api.admin.getStats();
      if (apiError) throw new Error(apiError);
      setStats(data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-sage/10 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="cosmic-card p-6 animate-pulse">
              <div className="h-20 bg-sage/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cosmic-card p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-coral mx-auto mb-4" />
        <p className="text-coral">{error}</p>
        <button
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-teal text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-teal',
      bgColor: 'bg-teal/10'
    },
    {
      label: 'Active Users (30d)',
      value: stats?.activeUsers || 0,
      icon: Activity,
      color: 'text-gold',
      bgColor: 'bg-gold/10'
    },
    {
      label: 'Total Programs',
      value: stats?.totalPrograms || 0,
      icon: Building,
      color: 'text-sage',
      bgColor: 'bg-sage/10'
    },
    {
      label: 'Total Check-ins',
      value: stats?.totalCheckins || 0,
      icon: Calendar,
      color: 'text-coral',
      bgColor: 'bg-coral/10'
    },
    {
      label: 'Avg Daily Check-ins',
      value: stats?.avgDailyCheckins || 0,
      icon: TrendingUp,
      color: 'text-teal',
      bgColor: 'bg-teal/10'
    },
    {
      label: 'Ximi Conversations',
      value: stats?.ximiConversationsCount || 0,
      icon: MessageSquare,
      color: 'text-gold',
      bgColor: 'bg-gold/10'
    },
    {
      label: 'Crisis Flags',
      value: stats?.crisisFlagsCount || 0,
      icon: AlertTriangle,
      color: 'text-coral',
      bgColor: 'bg-coral/10'
    },
    {
      label: 'Crisis Resolution Rate',
      value: `${stats?.crisisResolutionRate || 0}%`,
      icon: Activity,
      color: 'text-sage',
      bgColor: 'bg-sage/10'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-deepSage">Dashboard Overview</h1>
        <p className="text-textSecondaryLight mt-1">
          System-wide statistics and activity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            className="cosmic-card p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-textSecondaryLight">{card.label}</p>
                <p className="text-2xl font-bold text-deepSage mt-1">
                  {typeof card.value === 'number'
                    ? card.value.toLocaleString()
                    : card.value}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {stats?.checkinTrends && stats.checkinTrends.length > 0 && (
        <motion.div
          className="cosmic-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-deepSage mb-4">
            Check-in Trends (Last 30 Days)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.checkinTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric'
                    })
                  }
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-CA', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2D9D9D"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {stats?.userGrowth && stats.userGrowth.length > 0 && (
        <motion.div
          className="cosmic-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-deepSage mb-4">
            User Growth (Last 30 Days)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric'
                    })
                  }
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-CA', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#D4A84B"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}
