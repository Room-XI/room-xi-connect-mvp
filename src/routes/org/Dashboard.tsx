import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, FileText, ArrowRight, TrendingUp, Calendar } from 'lucide-react';

interface DashboardStats {
  activeYouth: number;
  pendingReferrals: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    activeYouth: 0,
    pendingReferrals: 0,
    programsCount: 0,
    thisMonthAttendance: 0
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id, organizations(name)')
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      setOrgId(membership.org_id);

      // Load stats
      const [youthCount, referralCount, programCount, attendanceCount] = await Promise.all([
        // Active youth with consent
        supabase
          .from('consents')
          .select('youth_id', { count: 'exact', head: true })
          .eq('grantee_org_id', membership.org_id)
          .eq('status', 'granted'),
        
        // Pending referrals
        supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('to_org_id', membership.org_id)
          .eq('status', 'sent'),
        
        // Programs
        supabase
          .from('programs')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', membership.org_id)
          .eq('active', true),
        
        // This month attendance
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .gte('checked_in_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .in('program_id', 
            supabase
              .from('programs')
              .select('id')
              .eq('org_id', membership.org_id)
          )
      ]);

      setStats({
        activeYouth: youthCount.count || 0,
        pendingReferrals: referralCount.count || 0,
        programsCount: programCount.count || 0,
        thisMonthAttendance: attendanceCount.count || 0
      });

      // Load recent activities
      const { data: recentReferrals } = await supabase
        .from('referrals')
        .select('id, created_at, youth_profiles(display_name)')
        .eq('to_org_id', membership.org_id)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentActivities: RecentActivity[] = (recentReferrals || []).map(r => ({
        id: r.id,
        type: 'referral' as const,
        description: `New referral received for ${r.youth_profiles?.display_name || 'youth'}`,
        timestamp: r.created_at
      }));

      setActivities(recentActivities);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cosmic-teal"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-cosmic-midnight mb-8">Organization Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Active Youth"
          value={stats.activeYouth}
          color="bg-cosmic-teal"
        />
        <StatCard
          icon={<ArrowRight className="w-6 h-6" />}
          label="Pending Referrals"
          value={stats.pendingReferrals}
          color="bg-cosmic-amber"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6" />}
          label="Active Programs"
          value={stats.programsCount}
          color="bg-cosmic-purple"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="This Month Attendance"
          value={stats.thisMonthAttendance}
          color="bg-cosmic-rose"
        />
      </div>

      {/* Recent Activity */}
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

      {/* Quick Actions */}
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

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string; 
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className={`${color} bg-opacity-10 w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        <div className={`${color.replace('bg-', 'text-')}`}>{icon}</div>
      </div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-cosmic-midnight">{value}</p>
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

