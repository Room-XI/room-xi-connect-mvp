import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Clock, 
  Shield, 
  Activity,
  Download,
  RefreshCw,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface KPICard {
  title: string;
  icon: React.ReactNode;
  primaryValue: string | number | null;
  secondaryValue?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  suppressed?: boolean;
}

export function KPIDashboard() {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [kpiData, setKpiData] = useState<{
    dailyCheckins: any;
    streakCompletion: any;
    exploreUnlocks: any;
    optInRates: any;
    staffUsage: any;
    referralConversion: any;
    crisisRouting: any;
  }>({
    dailyCheckins: null,
    streakCompletion: null,
    exploreUnlocks: null,
    optInRates: null,
    staffUsage: null,
    referralConversion: null,
    crisisRouting: null
  });

  const fetchKPIData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoints = [
        { key: 'dailyCheckins', url: `/api/kpi/daily-checkins?range=${dateRange}` },
        { key: 'streakCompletion', url: '/api/kpi/streak-completion' },
        { key: 'exploreUnlocks', url: `/api/kpi/explore-unlocks?range=${dateRange}` },
        { key: 'optInRates', url: '/api/kpi/opt-in-rates' },
        { key: 'staffUsage', url: '/api/kpi/staff-usage' },
        { key: 'referralConversion', url: '/api/kpi/referral-conversion' },
        { key: 'crisisRouting', url: '/api/kpi/crisis-routing' }
      ];

      const responses = await Promise.all(
        endpoints.map(async ({ key, url }) => {
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${key}`);
            const data = await response.json();
            return { key, data };
          } catch (err) {
            console.error(`Error fetching ${key}:`, err);
            return { key, data: null };
          }
        })
      );

      const newData: any = {};
      responses.forEach(({ key, data }) => {
        newData[key] = data;
      });

      setKpiData(newData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setError('Failed to load KPI data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchKPIData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchKPIData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchKPIData]);

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/api/kpi/export?range=${dateRange}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kpi-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export CSV. Please try again.');
    }
  };

  const formatValue = (value: any, type: string = 'number'): string => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (type) {
      case 'percent':
        return `${parseFloat(value).toFixed(1)}%`;
      case 'time':
        return `${Math.round(value)} min`;
      default:
        return value.toLocaleString();
    }
  };

  const getDailyCheckinsCard = (): KPICard => {
    const data = kpiData.dailyCheckins?.data;
    if (!data || data.length === 0) {
      return {
        title: 'Daily Check-ins',
        icon: <Activity className="h-5 w-5" />,
        primaryValue: null,
        description: 'No data available'
      };
    }

    const today = data[0];
    const yesterday = data[1];
    const avgCheckins = today?.checkins_per_user || 0;
    const trend = yesterday && today.dau > yesterday.dau ? 'up' : 
                  yesterday && today.dau < yesterday.dau ? 'down' : 'neutral';

    return {
      title: 'Daily Check-ins',
      icon: <Activity className="h-5 w-5" />,
      primaryValue: today?.dau || 0,
      secondaryValue: `${avgCheckins} per user`,
      trend,
      description: 'Daily active users',
      suppressed: today?.privacy_status === 'suppressed'
    };
  };

  const getStreakCompletionCard = (): KPICard => {
    const data = kpiData.streakCompletion?.data;
    if (!data || data.suppressed) {
      return {
        title: '7-Day Streak',
        icon: <Target className="h-5 w-5" />,
        primaryValue: null,
        description: 'Insufficient data',
        suppressed: true
      };
    }

    return {
      title: '7-Day Streak',
      icon: <Target className="h-5 w-5" />,
      primaryValue: formatValue(data.streak_completion_percent || data.streakCompletionPercent, 'percent'),
      secondaryValue: `${data.users_with_streak || 0} users`,
      description: 'Completion rate'
    };
  };

  const getExploreUnlocksCard = (): KPICard => {
    const data = kpiData.exploreUnlocks?.data;
    if (!data || data.length === 0) {
      return {
        title: 'Explore Unlocks',
        icon: <Clock className="h-5 w-5" />,
        primaryValue: null,
        description: 'No data available'
      };
    }

    const recent = data[0];
    const avgCompliance = data.reduce((acc: number, d: any) => 
      acc + parseFloat(d.unlock_compliance_percent || 0), 0) / data.length;

    return {
      title: 'Explore Unlocks',
      icon: <Clock className="h-5 w-5" />,
      primaryValue: formatValue(avgCompliance, 'percent'),
      secondaryValue: `${recent?.users_unlocked || 0} today`,
      description: 'Before 10 AM compliance',
      suppressed: recent?.privacy_status === 'suppressed'
    };
  };

  const getOptInRatesCard = (): KPICard => {
    const data = kpiData.optInRates?.data;
    if (!data || data.suppressed) {
      return {
        title: 'Opt-in Rates',
        icon: <Shield className="h-5 w-5" />,
        primaryValue: null,
        description: 'Insufficient data',
        suppressed: true
      };
    }

    const avgOptIn = ((parseFloat(data.location_percent || 0) + 
                      parseFloat(data.orb_percent || 0) + 
                      parseFloat(data.research_percent || 0)) / 3);

    return {
      title: 'Opt-in Rates',
      icon: <Shield className="h-5 w-5" />,
      primaryValue: formatValue(avgOptIn, 'percent'),
      secondaryValue: `${data.total_users || 0} users`,
      description: 'Average consent rate'
    };
  };

  const getStaffUsageCard = (): KPICard => {
    const data = kpiData.staffUsage?.data;
    if (!data || data.length === 0) {
      return {
        title: 'Staff Dashboard Use',
        icon: <Users className="h-5 w-5" />,
        primaryValue: null,
        description: 'No data available'
      };
    }

    const recent = data[0];
    return {
      title: 'Staff Dashboard Use',
      icon: <Users className="h-5 w-5" />,
      primaryValue: formatValue(recent?.usage_percent || 0, 'percent'),
      secondaryValue: `${recent?.staff_with_views || 0} / ${recent?.total_staff || 0}`,
      description: 'Weekly active staff',
      suppressed: recent?.privacy_status === 'suppressed'
    };
  };

  const getCrisisRoutingCard = (): KPICard => {
    const data = kpiData.crisisRouting?.data;
    if (!data || data.suppressed) {
      return {
        title: 'Crisis Response',
        icon: <AlertCircle className="h-5 w-5" />,
        primaryValue: null,
        description: 'Insufficient data',
        suppressed: true
      };
    }

    return {
      title: 'Crisis Response',
      icon: <AlertCircle className="h-5 w-5" />,
      primaryValue: formatValue(data.median_minutes, 'time'),
      secondaryValue: `${data.events_with_support || 0} / ${data.total_crisis_events || 0}`,
      description: 'Median response time'
    };
  };

  const getReferralConversionCard = (): KPICard => {
    const data = kpiData.referralConversion?.data;
    if (!data || data.length === 0) {
      return {
        title: 'Referral Conversion',
        icon: <TrendingUp className="h-5 w-5" />,
        primaryValue: null,
        description: 'No data available'
      };
    }

    const avgConversion = data.reduce((acc: number, d: any) => 
      acc + parseFloat(d.conversion_percent || 0), 0) / data.length;

    const totalViews = data.reduce((acc: number, d: any) => acc + (d.unique_views || 0), 0);
    const totalSignups = data.reduce((acc: number, d: any) => acc + (d.signups || 0), 0);

    return {
      title: 'Referral Conversion',
      icon: <TrendingUp className="h-5 w-5" />,
      primaryValue: formatValue(avgConversion, 'percent'),
      secondaryValue: `${totalSignups} / ${totalViews}`,
      description: 'Program signups'
    };
  };

  const kpiCards = [
    getDailyCheckinsCard(),
    getStreakCompletionCard(),
    getExploreUnlocksCard(),
    getOptInRatesCard(),
    getStaffUsageCard(),
    getReferralConversionCard(),
    getCrisisRoutingCard()
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KPI Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* Date Range Filter */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <Calendar className="h-4 w-4 text-gray-500 ml-2" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as '7' | '30' | '90')}
                  className="bg-transparent border-none focus:outline-none px-2 py-1"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchKPIData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Export Button */}
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {kpiCards.map((card, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-sm p-6 ${
                card.suppressed ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  {card.icon}
                </div>
                {card.trend && (
                  <div className={`text-sm ${
                    card.trend === 'up' ? 'text-green-500' : 
                    card.trend === 'down' ? 'text-red-500' : 
                    'text-gray-500'
                  }`}>
                    {card.trend === 'up' ? '↑' : card.trend === 'down' ? '↓' : '—'}
                  </div>
                )}
              </div>
              
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {card.title}
              </h3>
              
              {card.suppressed ? (
                <div className="text-gray-400">
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-xs mt-1">Data suppressed for privacy</p>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.primaryValue !== null ? card.primaryValue : '—'}
                  </p>
                  {card.secondaryValue && (
                    <p className="text-sm text-gray-500 mt-1">
                      {card.secondaryValue}
                    </p>
                  )}
                  {card.description && (
                    <p className="text-xs text-gray-400 mt-2">
                      {card.description}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Privacy Protection Active</p>
              <p>
                All metrics displayed include differential privacy noise (ε=0.5) to protect individual privacy. 
                Metrics with fewer than 7 users are automatically suppressed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}