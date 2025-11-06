import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Users, Activity, TrendingUp, Heart, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface TransparencyStats {
  activeUsers: number;
  dailyCheckIns: number;
  streaksCompleted: number;
  programsEngaged: number;
  ximiInteractions: number;
  crisisSupport: number;
  privacyMetadata: {
    noiseApplied: boolean;
    epsilon: number;
    lastUpdated: string;
  };
}

export function TransparencyDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<TransparencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch('/api/transparency/stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transparency data');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(t('transparency.error'));
      console.error('Error fetching transparency stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: number; 
    color: string;
  }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('transparency.title')}
            </h1>
            <button
              onClick={fetchStats}
              disabled={refreshing}
              className={`p-2 rounded-lg ${
                refreshing 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('transparency.subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={Users}
            label={t('transparency.activeUsers')}
            value={stats?.activeUsers || 0}
            color="border-blue-500"
          />
          <StatCard
            icon={Activity}
            label={t('transparency.dailyCheckIns')}
            value={stats?.dailyCheckIns || 0}
            color="border-green-500"
          />
          <StatCard
            icon={TrendingUp}
            label={t('transparency.streaksCompleted')}
            value={stats?.streaksCompleted || 0}
            color="border-yellow-500"
          />
          <StatCard
            icon={Heart}
            label={t('transparency.programsEngaged')}
            value={stats?.programsEngaged || 0}
            color="border-purple-500"
          />
          <StatCard
            icon={Activity}
            label={t('transparency.ximiInteractions')}
            value={stats?.ximiInteractions || 0}
            color="border-indigo-500"
          />
          <StatCard
            icon={AlertTriangle}
            label={t('transparency.crisisSupport')}
            value={stats?.crisisSupport || 0}
            color="border-red-500"
          />
        </div>

        {/* Privacy Protection Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
          <div className="flex items-center mb-6">
            <Shield className="w-8 h-8 text-green-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('transparency.dataProtection')}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  {t('transparency.differentialPrivacy')}
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  {t('transparency.noIndividualData')}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  {t('transparency.aggregateOnly')}
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  {t('transparency.privacyFirst')}
                </p>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          {stats?.privacyMetadata && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('transparency.lastUpdated', { 
                  time: new Date(stats.privacyMetadata.lastUpdated).toLocaleString() 
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}