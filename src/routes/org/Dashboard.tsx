import { useEffect, useState } from 'react';
import { Users, FileText, ArrowRight, TrendingUp, Calendar, Activity, Heart, ChevronDown, BarChart3, Repeat, Download, UserPlus, ClipboardList, ThumbsUp } from 'lucide-react';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
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
  totalResponses: number;
  anonymized: boolean;
  message?: string;
  averageHelpfulness: number | null;
  wouldRecommendPercentage: number | null;
  outcomesTimeline: Array<{ date: string; responses: number; avgHelpfulness: number }>;
}

interface AttendanceRecord {
  id: string;
  programId: string;
  xidHash: string;
  method: string;
  site: string | null;
  createdAt: string;
}

type TimeRange = '7days' | '30days' | '90days' | 'all';

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
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({ xidId: '', method: 'manual' });
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadOutcomes(selectedProgram, timeRange);
      loadAttendance(selectedProgram);
    }
  }, [selectedProgram, timeRange]);

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

  async function loadOutcomes(programId: string, range: TimeRange) {
    try {
      setOutcomesLoading(true);
      const { data, error } = await api.org.getProgramOutcomes(programId, range);
      if (!error && data) {
        setOutcomes(data);
      }
    } catch (err) {
      console.error('Error loading outcomes:', err);
    } finally {
      setOutcomesLoading(false);
    }
  }

  async function loadAttendance(programId: string) {
    try {
      setAttendanceLoading(true);
      const { data, error } = await api.org.getProgramAttendance(programId);
      if (!error && data) {
        setAttendance(data);
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function handleRecordAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProgram || !attendanceForm.xidId) return;

    try {
      setAttendanceSubmitting(true);
      const { error } = await api.org.recordProgramAttendance(selectedProgram, {
        xidId: attendanceForm.xidId,
        method: attendanceForm.method
      });

      if (error) {
        alert(error);
        return;
      }

      setAttendanceForm({ xidId: '', method: 'manual' });
      setShowAttendanceForm(false);
      loadAttendance(selectedProgram);
    } catch (err) {
      console.error('Error recording attendance:', err);
      alert('Failed to record attendance');
    } finally {
      setAttendanceSubmitting(false);
    }
  }

  async function handleExportAttendance() {
    try {
      setExportLoading(true);
      const { data, error } = await api.org.exportAttendance(timeRange === 'all' ? 'all' : timeRange === '7days' ? '7days' : '30days');
      
      if (error) {
        alert('Failed to export attendance');
        return;
      }

      if (data?.csv) {
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting attendance:', err);
      alert('Failed to export attendance');
    } finally {
      setExportLoading(false);
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(['7days', '30days', '90days', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm rounded-md transition ${
                    timeRange === range
                      ? 'bg-white text-cosmic-teal shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : range === '90days' ? '90 Days' : 'All Time'}
                </button>
              ))}
            </div>
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
            {outcomes.anonymized ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center mb-6">
                <p className="text-amber-700">{outcomes.message}</p>
                <p className="text-sm text-amber-600 mt-2">
                  {outcomes.totalResponses} response(s) collected so far
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <MetricCard
                    icon={<ClipboardList className="w-5 h-5" />}
                    label="Total Responses"
                    value={outcomes.totalResponses}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                  />
                  <MetricCard
                    icon={<Heart className="w-5 h-5" />}
                    label="Avg Helpfulness"
                    value={outcomes.averageHelpfulness !== null ? `${outcomes.averageHelpfulness}/5` : 'N/A'}
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                  />
                  <MetricCard
                    icon={<ThumbsUp className="w-5 h-5" />}
                    label="Would Recommend"
                    value={outcomes.wouldRecommendPercentage !== null ? `${outcomes.wouldRecommendPercentage}%` : 'N/A'}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                  />
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-cosmic-midnight mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Outcomes Trend
                  </h3>
                  {outcomes.outcomesTimeline && outcomes.outcomesTimeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={outcomes.outcomesTimeline}>
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
                        />
                        <Line 
                          type="monotone" 
                          dataKey="responses" 
                          stroke="#5FA8A3" 
                          strokeWidth={2} 
                          dot={{ fill: '#5FA8A3' }}
                          name="Responses"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avgHelpfulness" 
                          stroke="#D9A962" 
                          strokeWidth={2} 
                          dot={{ fill: '#D9A962' }}
                          name="Avg Helpfulness"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-gray-500">
                      No outcome data available for this time range
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select a program to view outcome metrics
          </div>
        )}
      </div>

      {selectedProgram && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-cosmic-midnight flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Attendance Operations
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAttendanceForm(!showAttendanceForm)}
                className="flex items-center gap-2 px-4 py-2 bg-cosmic-teal text-white rounded-lg hover:bg-cosmic-teal/90 transition"
              >
                <UserPlus className="w-4 h-4" />
                Record Attendance
              </button>
              <button
                onClick={handleExportAttendance}
                disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                {exportLoading ? (
                  <div className="w-4 h-4 border-2 border-cosmic-teal border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export CSV
              </button>
            </div>
          </div>

          {showAttendanceForm && (
            <form onSubmit={handleRecordAttendance} className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">XID Hash</label>
                  <input
                    type="text"
                    value={attendanceForm.xidId}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, xidId: e.target.value })}
                    placeholder="Enter XID or scan QR"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cosmic-teal focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select
                    value={attendanceForm.method}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, method: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cosmic-teal focus:border-transparent"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="qr_scan">QR Scan</option>
                    <option value="check_in">Check-in Kiosk</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={attendanceSubmitting}
                    className="w-full px-4 py-2 bg-cosmic-teal text-white rounded-lg hover:bg-cosmic-teal/90 transition disabled:opacity-50"
                  >
                    {attendanceSubmitting ? 'Recording...' : 'Record'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {attendanceLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : attendance.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No attendance records for this program yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">XID (Hashed)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Site</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Recorded At</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.slice(0, 10).map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono text-gray-600">
                        {record.xidHash.slice(0, 12)}...
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.method === 'qr_scan' ? 'bg-green-100 text-green-700' :
                          record.method === 'manual' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {record.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.site || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(record.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendance.length > 10 && (
                <p className="text-sm text-gray-500 text-center py-3">
                  Showing 10 of {attendance.length} records. Export CSV for full list.
                </p>
              )}
            </div>
          )}
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <QuickAction
          title="Manage Programs"
          description="View and edit your programs"
          href="/org/programs"
        />
        <QuickAction
          title="Staff Management"
          description="Manage team members and roles"
          href="/org/staff"
        />
        <QuickAction
          title="Create Referral"
          description="Refer a youth to another organization"
          href="/org/referrals/new"
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
