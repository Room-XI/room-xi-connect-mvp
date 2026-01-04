import { useEffect, useState } from 'react';
import { Users, FileText, ArrowRight, TrendingUp, Calendar, Activity, Heart, ChevronDown, BarChart3, Repeat } from 'lucide-react';
import { useSession } from '@/lib/session';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCheckins: number;
  avgMood: number;
  programsCount: number;
  thisMonthAttendance: number;
}

interface Program {
  id: string;
  title: string;
  organizer: string | null;
}

interface ProgramOutcomes {
  uniqueParticipants: number;
  attendanceRate: number;
  avgMoodBefore: number | null;
  avgMoodAfter: number | null;
  moodImprovement: number | null;
  retentionRate: number;
  attendanceTimeline: Array<{ date: string; attendees: number }>;
  sessionsTimeline: Array<{ week: string; sessions: number }>;
}

interface RecentActivity {
  id: string;
  type: 'referral' | 'attendance' | 'program';
  description: string;
  timestamp: string;
}

export default function OrgDashboard() {
  const { user } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<ProgramOutcomes | null>(null);
  const [outcomesLoading, setOutcomesLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadOutcomes(selectedProgram);
    }
  }, [selectedProgram]);

  async function loadDashboard() {
    try {
      if (!user) return;
      setLoading(true);
      setError(null);

      const response = await fetch('/api/org/dashboard/stats', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view the dashboard');
        } else if (response.status === 403) {
          setError('Organization admin access required');
        } else {
          setError('Failed to load dashboard data');
        }
        return;
      }

      const data = await response.json();
      setStats(data);
      setActivities([]);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }

  async function loadPrograms() {
    try {
      const response = await fetch('/api/org/programs', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPrograms(data);
        if (data.length > 0) {
          setSelectedProgram(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading programs:', err);
    }
  }

  async function loadOutcomes(programId: string) {
    try {
      setOutcomesLoading(true);
      const response = await fetch(`/api/org/outcomes/${programId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setOutcomes(data);
      }
    } catch (err) {
      console.error('Error loading outcomes:', err);
    } finally {
      setOutcomesLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-cosmic-midnight mb-8">Organization Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-cosmic-midnight mb-8">Organization Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-cosmic-teal text-white rounded-lg hover:bg-cosmic-teal/90 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-cosmic-midnight mb-8">Organization Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total Registered Users"
          value={stats?.totalUsers ?? 0}
          color="bg-cosmic-teal"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Active Users (30 Days)"
          value={stats?.activeUsers ?? 0}
          color="bg-cosmic-purple"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Total Check-ins"
          value={stats?.totalCheckins ?? 0}
          color="bg-cosmic-amber"
        />
        <StatCard
          icon={<Heart className="w-6 h-6" />}
          label="Avg Mood Level"
          value={stats?.avgMood ?? 0}
          suffix="/6"
          color="bg-cosmic-rose"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6" />}
          label="Active Programs"
          value={stats?.programsCount ?? 0}
          color="bg-indigo-500"
        />
        <StatCard
          icon={<ArrowRight className="w-6 h-6" />}
          label="This Month Attendance"
          value={stats?.thisMonthAttendance ?? 0}
          color="bg-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-cosmic-midnight flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Program Outcome Dashboard
          </h2>
          <div className="relative">
            <select
              value={selectedProgram || ''}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cosmic-teal focus:border-transparent min-w-[200px]"
            >
              {programs.length === 0 ? (
                <option value="">No programs available</option>
              ) : (
                programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {outcomesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : outcomes ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                icon={<Users className="w-5 h-5" />}
                label="Unique Participants"
                value={outcomes.uniqueParticipants}
                color="text-blue-600"
                bgColor="bg-blue-50"
              />
              <MetricCard
                icon={<Activity className="w-5 h-5" />}
                label="Attendance Rate"
                value={`${outcomes.attendanceRate}%`}
                color="text-emerald-600"
                bgColor="bg-emerald-50"
              />
              <MetricCard
                icon={<Heart className="w-5 h-5" />}
                label="Mood Improvement"
                value={outcomes.moodImprovement !== null ? `${outcomes.moodImprovement > 0 ? '+' : ''}${outcomes.moodImprovement}` : 'N/A'}
                subtitle={outcomes.avgMoodBefore !== null && outcomes.avgMoodAfter !== null 
                  ? `${outcomes.avgMoodBefore} → ${outcomes.avgMoodAfter}` 
                  : undefined}
                color={outcomes.moodImprovement !== null && outcomes.moodImprovement > 0 ? "text-green-600" : "text-amber-600"}
                bgColor={outcomes.moodImprovement !== null && outcomes.moodImprovement > 0 ? "bg-green-50" : "bg-amber-50"}
              />
              <MetricCard
                icon={<Repeat className="w-5 h-5" />}
                label="Retention Rate"
                value={`${outcomes.retentionRate}%`}
                color="text-purple-600"
                bgColor="bg-purple-50"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-cosmic-midnight mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Attendance Over Time (Last 3 Months)
                </h3>
                {outcomes.attendanceTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={outcomes.attendanceTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DE" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#7D8471"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis stroke="#7D8471" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#FFFAF5', border: '1px solid #E8E5DE', borderRadius: '8px' }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        }}
                        formatter={(value: number) => [`${value} attendees`, 'Attendees']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attendees" 
                        stroke="#5FA8A3" 
                        strokeWidth={2} 
                        dot={{ fill: '#5FA8A3' }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    No attendance data available
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-cosmic-midnight mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Sessions Per Week
                </h3>
                {outcomes.sessionsTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBarChart data={outcomes.sessionsTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DE" />
                      <XAxis 
                        dataKey="week" 
                        stroke="#7D8471"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#7D8471" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#FFFAF5', border: '1px solid #E8E5DE', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value} sessions`, 'Sessions']}
                      />
                      <Bar 
                        dataKey="sessions" 
                        fill="#D9A962" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    No session data available
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select a program to view outcome metrics
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-cosmic-midnight mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Recent Activity
        </h2>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <p className="text-sm text-gray-700">{activity.description}</p>
                <span className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <QuickAction
          title="Create Referral"
          description="Refer a youth to another organization"
          href="/org/referrals/new"
        />
        <QuickAction
          title="Manage Programs"
          description="View and edit your programs"
          href="/org/programs"
        />
        <QuickAction
          title="View Reports"
          description="Export data and analytics"
          href="/org/reports"
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, suffix }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string;
  suffix?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className={`${color} bg-opacity-10 w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        <div className={`${color.replace('bg-', 'text-')}`}>{icon}</div>
      </div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-cosmic-midnight">
        {value.toLocaleString()}{suffix && <span className="text-lg text-gray-500">{suffix}</span>}
      </p>
    </div>
  );
}

function MetricCard({ icon, label, value, subtitle, color, bgColor }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={color}>{icon}</div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function QuickAction({ title, description, href }: { 
  title: string; 
  description: string; 
  href: string; 
}) {
  return (
    <a
      href={href}
      className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100"
    >
      <h3 className="font-semibold text-cosmic-midnight mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}
