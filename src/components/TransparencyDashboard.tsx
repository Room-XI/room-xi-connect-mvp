import React, { useState, useEffect } from 'react';
import { Download, Shield, Users, Activity, TrendingUp, Heart, AlertTriangle, BarChart, FileText } from 'lucide-react';

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

interface MoodDistribution {
  distribution: Record<string, number>;
  metadata: {
    period: string;
    noiseApplied: boolean;
    epsilon: number;
    minThreshold: number;
  };
}

interface OptInRates {
  data: {
    totalUsers: number;
    locationOptInRate: string;
    orbSharingRate: string;
    reflectionsSharingRate: string;
    notificationsOptInRate: string;
  } | null;
  metadata: {
    noiseApplied: boolean;
    epsilon: number;
    minThreshold: number;
  };
}

export function TransparencyDashboard() {
  const [stats, setStats] = useState<TransparencyStats | null>(null);
  const [moodDistribution, setMoodDistribution] = useState<MoodDistribution | null>(null);
  const [optInRates, setOptInRates] = useState<OptInRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all transparency data in parallel
        const [statsRes, moodRes, optInRes] = await Promise.all([
          fetch('/api/transparency/stats'),
          fetch('/api/transparency/mood-distribution'),
          fetch('/api/transparency/opt-in-rates')
        ]);

        if (!statsRes.ok || !moodRes.ok || !optInRes.ok) {
          throw new Error('Failed to fetch transparency data');
        }

        const [statsData, moodData, optInData] = await Promise.all([
          statsRes.json(),
          moodRes.json(),
          optInRes.json()
        ]);

        setStats(statsData);
        setMoodDistribution(moodData);
        setOptInRates(optInData);
      } catch (err) {
        setError('Failed to load transparency data. Please try again later.');
        console.error('Error fetching transparency data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Only run once on mount - static HTML-like behavior

  // Static card component for displaying stats
  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: number | string; 
    color: string;
  }) => (
    <div className={`bg-white rounded-xl p-6 shadow-md border-l-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6 text-gray-600" />
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transparency data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Render mood distribution chart (simple bar chart)
  const renderMoodDistribution = () => {
    if (!moodDistribution || !moodDistribution.distribution) {
      return <p className="text-gray-500">No mood data available (minimum 7 responses required per mood)</p>;
    }

    const moods = Object.entries(moodDistribution.distribution);
    if (moods.length === 0) {
      return <p className="text-gray-500">Insufficient data for display (privacy threshold not met)</p>;
    }

    const maxCount = Math.max(...moods.map(([_, count]) => count));

    return (
      <div className="space-y-4">
        {moods.map(([mood, count]) => (
          <div key={mood} className="flex items-center gap-4">
            <span className="w-24 text-sm font-medium text-gray-700 capitalize">{mood}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full flex items-center justify-end pr-2"
                style={{ width: `${(count / maxCount) * 100}%` }}
              >
                <span className="text-white text-xs font-semibold">{count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Transparency Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Community aggregate statistics with privacy protection applied
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Community Overview Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Community Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={Users}
              label="Active Users (30 days)"
              value={stats?.activeUsers || 0}
              color="border-blue-500"
            />
            <StatCard
              icon={Activity}
              label="Daily Check-ins"
              value={stats?.dailyCheckIns || 0}
              color="border-green-500"
            />
            <StatCard
              icon={TrendingUp}
              label="7-Day Streaks Completed"
              value={stats?.streaksCompleted || 0}
              color="border-yellow-500"
            />
          </div>
        </section>

        {/* Community Mood Distribution Section */}
        <section className="mb-12 bg-white rounded-xl p-8 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Community Mood Distribution
            </h2>
            <span className="text-sm text-gray-500">Last 30 days</span>
          </div>
          {renderMoodDistribution()}
        </section>

        {/* Program Engagement Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Program Engagement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              icon={Heart}
              label="Programs Engaged"
              value={stats?.programsEngaged || 0}
              color="border-purple-500"
            />
            <StatCard
              icon={Activity}
              label="AI Support Interactions"
              value={stats?.ximiInteractions || 0}
              color="border-indigo-500"
            />
          </div>
        </section>

        {/* Crisis Support Section */}
        <section className="mb-12 bg-white rounded-xl p-8 shadow-md">
          <div className="flex items-center mb-6">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              Crisis Support Utilization
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-3xl font-bold text-gray-900">{stats?.crisisSupport || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Crisis support sessions provided</p>
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• All data is anonymized and aggregated</p>
              <p>• No individual user data is exposed</p>
              <p>• Differential privacy applied (ε = 0.5)</p>
            </div>
          </div>
        </section>

        {/* Consent Opt-in Rates Section */}
        <section className="mb-12 bg-white rounded-xl p-8 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Consent Opt-in Rates</h2>
          {optInRates?.data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-lg font-semibold text-gray-700">Location Sharing</p>
                <p className="text-3xl font-bold text-blue-600">{optInRates.data.locationOptInRate}%</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-700">Mood Orb Sharing</p>
                <p className="text-3xl font-bold text-purple-600">{optInRates.data.orbSharingRate}%</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-700">Reflections Sharing</p>
                <p className="text-3xl font-bold text-green-600">{optInRates.data.reflectionsSharingRate}%</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-700">Notifications</p>
                <p className="text-3xl font-bold text-orange-600">{optInRates.data.notificationsOptInRate}%</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Insufficient data for privacy-preserving display</p>
          )}
        </section>

        {/* CSV Download Section */}
        <section className="mb-12 bg-white rounded-xl p-8 shadow-md">
          <div className="flex items-center mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Download KPI Data</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Export aggregated KPI metrics with differential privacy applied. All data follows N ≥ 7 threshold rule.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/api/transparency/kpi-export"
              download
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All KPI Metrics (CSV)
            </a>
            <a
              href="/api/kpi/export"
              download
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Detailed KPIs (Staff Only)
            </a>
          </div>
        </section>

        {/* Privacy Protection Info */}
        <section className="mb-12 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-8 shadow-md">
          <div className="flex items-center mb-6">
            <Shield className="w-8 h-8 text-green-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              Privacy Protection Applied
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-gray-800">Differential Privacy</p>
                  <p className="text-sm text-gray-600">Statistical noise added (ε = 0.5) to prevent individual identification</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-gray-800">Minimum Threshold</p>
                  <p className="text-sm text-gray-600">Data only displayed when N ≥ 7 users contribute</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-gray-800">No Individual Data</p>
                  <p className="text-sm text-gray-600">All metrics are aggregated at the community level</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="font-semibold text-gray-800">Privacy by Design</p>
                  <p className="text-sm text-gray-600">Built with user privacy as the core principle</p>
                </div>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          {stats?.privacyMetadata && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Last updated: {new Date(stats.privacyMetadata.lastUpdated).toLocaleString()}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Footer Disclaimer */}
      <footer className="bg-gray-800 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-lg mb-4">
            <strong>Important:</strong> Mood visuals are self reported reflections, not diagnostic indicators.
          </p>
          <p className="text-sm text-gray-300">
            All data displayed on this dashboard has differential privacy applied and follows the N ≥ 7 threshold rule. 
            No individual user data is exposed or can be inferred from these statistics.
          </p>
        </div>
      </footer>
    </div>
  );
}