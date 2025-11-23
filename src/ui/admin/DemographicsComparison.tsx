import { useEffect, useState } from 'react';
import { Eye, EyeOff, TrendingUp, Users, BarChart3 } from 'lucide-react';

interface ComparisonStats {
  total: number;
  sexualOrientationMatch: number;
  genderIdentityMatch: number;
  racialIdentityMatch: number;
  awarenessLevels: Record<string, number>;
  comfortLevels: Record<string, number>;
}

interface Comparison {
  userId: string;
  youth: {
    sexualOrientation?: string;
    genderIdentity?: string;
    racialIdentity?: string[];
  };
  guardian: {
    perceivedSexualOrientation?: string;
    perceivedGenderIdentity?: string;
    perceivedRacialIdentity?: string[];
    awarenessLevel?: string;
    comfortWithIdentity?: string;
  };
  matches: {
    sexualOrientation: boolean;
    genderIdentity: boolean;
    racialIdentity: boolean;
  };
}

export function DemographicsComparison() {
  const [stats, setStats] = useState<ComparisonStats | null>(null);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const fetchComparisonData = async () => {
    try {
      const response = await fetch('/api/demographics/comparison?detailed=true', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }

      const data = await response.json();
      setStats(data.stats);
      setComparisons(data.comparisons || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">Error loading demographics comparison: {error}</div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Demographics: Youth vs Guardian Perception</h2>
        <p className="text-gray-500">No comparison data available yet. Data will appear once guardians complete verification surveys.</p>
      </div>
    );
  }

  const matchPercentage = (matched: number, total: number) => 
    total > 0 ? Math.round((matched / total) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Demographics: Youth vs Guardian Perception</h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Sexual Orientation Match</p>
              <p className="text-2xl font-bold text-purple-900">
                {matchPercentage(stats.sexualOrientationMatch, stats.total)}%
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {stats.sexualOrientationMatch} of {stats.total} match
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Gender Identity Match</p>
              <p className="text-2xl font-bold text-blue-900">
                {matchPercentage(stats.genderIdentityMatch, stats.total)}%
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {stats.genderIdentityMatch} of {stats.total} match
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Racial Identity Match</p>
              <p className="text-2xl font-bold text-green-900">
                {matchPercentage(stats.racialIdentityMatch, stats.total)}%
              </p>
              <p className="text-xs text-green-600 mt-1">
                {stats.racialIdentityMatch} of {stats.total} match
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Awareness Levels */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Guardian Awareness Levels</h3>
        <div className="space-y-2">
          {Object.entries(stats.awarenessLevels).map(([level, count]) => {
            const percentage = matchPercentage(count, stats.total);
            return (
              <div key={level} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-32">{formatLabel(level)}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-teal-500 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 10 && (
                      <span className="text-xs text-white font-medium">{percentage}%</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500 w-12">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comfort Levels */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Guardian Comfort Levels</h3>
        <div className="space-y-2">
          {Object.entries(stats.comfortLevels).map(([level, count]) => {
            const percentage = matchPercentage(count, stats.total);
            const colorClass = getComfortColor(level);
            return (
              <div key={level} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-32">{formatLabel(level)}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className={`absolute inset-y-0 left-0 ${colorClass} rounded-full flex items-center justify-end pr-2`}
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 10 && (
                      <span className="text-xs text-white font-medium">{percentage}%</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500 w-12">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Comparisons */}
      {showDetails && comparisons.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Individual Comparisons</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">User ID</th>
                  <th className="text-left py-2">Sexual Orientation</th>
                  <th className="text-left py-2">Gender Identity</th>
                  <th className="text-left py-2">Awareness</th>
                  <th className="text-left py-2">Comfort</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((comp, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 text-xs font-mono">{comp.userId.slice(0, 8)}...</td>
                    <td className="py-2">
                      <MatchIndicator matches={comp.matches.sexualOrientation} />
                    </td>
                    <td className="py-2">
                      <MatchIndicator matches={comp.matches.genderIdentity} />
                    </td>
                    <td className="py-2 text-xs">{formatLabel(comp.guardian.awarenessLevel || 'unknown')}</td>
                    <td className="py-2 text-xs">{formatLabel(comp.guardian.comfortWithIdentity || 'unknown')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-50 rounded-lg">
        <p className="text-xs text-amber-800">
          <strong>Privacy Note:</strong> This data compares how youth self-identify versus how their guardians perceive them. 
          This helps identify gaps in understanding and areas where family support programs may be beneficial. 
          Individual data is anonymized and only aggregate statistics are reported.
        </p>
      </div>
    </div>
  );
}

function MatchIndicator({ matches }: { matches: boolean }) {
  return matches ? (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
      Match
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
      Differs
    </span>
  );
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getComfortColor(level: string): string {
  switch (level) {
    case 'very_comfortable':
      return 'bg-green-500';
    case 'comfortable':
      return 'bg-green-400';
    case 'neutral':
      return 'bg-gray-400';
    case 'uncomfortable':
      return 'bg-amber-500';
    case 'very_uncomfortable':
      return 'bg-red-500';
    case 'learning':
      return 'bg-blue-500';
    default:
      return 'bg-gray-400';
  }
}