import { useEffect, useState } from 'react';
import { Users, FileText, ArrowRight, TrendingUp, Calendar, Activity, Heart } from 'lucide-react';
import { useSession } from '@/lib/session';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCheckins: number;
  avgMood: number;
  programsCount: number;
  thisMonthAttendance: number;
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

  useEffect(() => {
    loadDashboard();
  }, []);

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
