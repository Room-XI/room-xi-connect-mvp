import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle,
  Calendar,
  Download,
  BarChart,
  MessageSquare,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { useSession } from '@/lib/session';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { DemographicsComparison } from '@/ui/admin/DemographicsComparison';
import { BreachManagement } from '@/ui/admin/BreachManagement';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: any;
  new_values: any;
  timestamp: string;
  user_id: string | null;
}

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

export default function Admin() {
  const { user } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const exportAuditLogsCSV = () => {
    if (auditLogs.length === 0) return;
    
    const headers = ['ID', 'Action', 'Table', 'Record ID', 'Timestamp', 'User ID', 'Old Values', 'New Values'];
    const csvRows = [headers.join(',')];
    
    auditLogs.forEach(log => {
      const row = [
        log.id,
        log.action,
        log.table_name,
        log.record_id || '',
        log.timestamp,
        log.user_id || '',
        log.old_values ? JSON.stringify(log.old_values).replace(/,/g, ';') : '',
        log.new_values ? JSON.stringify(log.new_values).replace(/,/g, ';') : ''
      ];
      csvRows.push(row.map(cell => `"${cell}"`).join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isAdmin) {
      loadAuditLogs();
    }
  }, [selectedAction, currentPage, isAdmin]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        setIsAdmin(false);
        return;
      }

      await Promise.all([loadAuditLogs(), loadStats()]);
      setIsAdmin(true);
    } catch (error: any) {
      console.error('Error checking admin access:', error);
      if (error?.message?.includes('Admin access required') || error?.message?.includes('403')) {
        setIsAdmin(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error: apiError } = await api.admin.getAuditLogs({
        page: currentPage,
        limit: 20,
        action: selectedAction !== 'all' ? selectedAction : undefined,
      });

      if (apiError) {
        throw new Error(apiError);
      }

      if (data) {
        setAuditLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      if (error?.message?.includes('403')) {
        throw error;
      }
    }
  };

  const loadStats = async () => {
    try {
      const { data, error: apiError } = await api.admin.getStats();

      if (apiError) {
        throw new Error(apiError);
      }

      if (data) {
        setStats(data);
      }
    } catch (error: any) {
      console.error('Error loading stats:', error);
      if (error?.message?.includes('403')) {
        throw error;
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'insert':
        return 'text-teal bg-teal/10';
      case 'update':
        return 'text-gold bg-gold/10';
      case 'delete':
        return 'text-coral bg-coral/10';
      default:
        return 'text-sage bg-sage/10';
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const { error } = await api.admin.logout();
      
      if (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
        setLoggingOut(false);
        return;
      }

      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="h-8 bg-sage/10 rounded w-48 animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="cosmic-card p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-5 bg-sage/10 rounded" />
              <div className="h-20 bg-sage/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="py-6">
        <motion.div
          className="cosmic-card p-8 text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <AlertTriangle className="w-12 h-12 text-coral mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-deepSage">
              Access Denied
            </h2>
            <p className="text-textSecondaryLight">
              You don't have permission to access the admin panel.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-coral" />
            <h1 className="text-2xl font-display font-bold text-deepSage">
              Admin Panel
            </h1>
          </div>
          <motion.button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
              loggingOut 
                ? 'bg-sage/20 text-sage cursor-not-allowed' 
                : 'bg-coral/10 text-coral hover:bg-coral/20'
            }`}
            whileHover={!loggingOut ? { scale: 1.05 } : {}}
            whileTap={!loggingOut ? { scale: 0.95 } : {}}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">
              {loggingOut ? 'Logging out...' : 'Logout'}
            </span>
          </motion.button>
        </div>
        <p className="text-textSecondaryLight">
          System overview and audit logs
        </p>
      </motion.div>

      {/* KPI Dashboard Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        <Link
          to="/kpi-dashboard"
          className="cosmic-card p-6 flex items-center space-x-4 hover:bg-sage/5 transition-colors block"
        >
          <div className="p-3 bg-teal/10 rounded-lg">
            <BarChart className="w-8 h-8 text-teal" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-deepSage">KPI Dashboard</h3>
            <p className="text-sm text-textSecondaryLight">
              View key performance indicators and export metrics
            </p>
          </div>
          <div className="text-sage">→</div>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      {stats && (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="cosmic-card p-4 text-center">
            <Users className="w-6 h-6 text-teal mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.totalUsers}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Total Users
            </div>
            <div className="text-xs text-sage mt-1">
              {stats.activeUsers} active (30d)
            </div>
          </div>
          
          <div className="cosmic-card p-4 text-center">
            <Activity className="w-6 h-6 text-gold mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.totalCheckins}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Check-ins
            </div>
            <div className="text-xs text-sage mt-1">
              {stats.avgDailyCheckins} avg/day
            </div>
          </div>
          
          <div className="cosmic-card p-4 text-center">
            <Calendar className="w-6 h-6 text-sage mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.totalPrograms}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Programs
            </div>
            <div className="text-xs text-sage mt-1">
              {stats.totalAttendance} attendance
            </div>
          </div>
          
          <div className="cosmic-card p-4 text-center">
            <MessageSquare className="w-6 h-6 text-coral mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.ximiConversationsCount}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Ximi Chats
            </div>
          </div>

          <div className="cosmic-card p-4 text-center col-span-2">
            <AlertTriangle className="w-6 h-6 text-coral mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.crisisFlagsCount}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Crisis Flags
            </div>
            <div className="text-xs text-sage mt-1">
              {stats.crisisResolutionRate}% resolved
            </div>
          </div>

          <div className="cosmic-card p-4 text-center col-span-2">
            <TrendingUp className="w-6 h-6 text-teal mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.userGrowth.reduce((sum, day) => sum + day.count, 0)}
            </div>
            <div className="text-sm text-textSecondaryLight">
              New Users (30d)
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      {stats && (
        <>
          {/* User Growth Chart */}
          <motion.div
            className="cosmic-card p-6 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h2 className="text-lg font-semibold text-deepSage flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>User Growth (Last 30 Days)</span>
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DE" />
                <XAxis 
                  dataKey="date" 
                  stroke="#7D8471"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#7D8471" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFAF5', border: '1px solid #E8E5DE', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                />
                <Line type="monotone" dataKey="count" stroke="#5FA8A3" strokeWidth={2} dot={{ fill: '#5FA8A3' }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Check-in Trends Chart */}
          <motion.div
            className="cosmic-card p-6 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-lg font-semibold text-deepSage flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Check-in Trends (Last 30 Days)</span>
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsBarChart data={stats.checkinTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DE" />
                <XAxis 
                  dataKey="date" 
                  stroke="#7D8471"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#7D8471" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFAF5', border: '1px solid #E8E5DE', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                />
                <Bar dataKey="count" fill="#D9A962" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Demographics Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <DemographicsComparison />
          </motion.div>

          {/* Breach Management */}
          <motion.div
            className="cosmic-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <BreachManagement />
          </motion.div>
        </>
      )}

      {/* Audit Logs */}
      <motion.div
        className="cosmic-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-deepSage">
            Audit Logs
          </h2>
          
          <div className="flex items-center space-x-3">
            {/* Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-sm border border-borderMutedLight rounded-lg px-3 py-2 bg-surface"
            >
              <option value="all">All Actions</option>
              <option value="insert">Inserts</option>
              <option value="update">Updates</option>
              <option value="delete">Deletes</option>
            </select>
            
            {/* Export */}
            <button 
              onClick={exportAuditLogsCSV}
              disabled={auditLogs.length === 0}
              className="p-2 rounded-lg hover:bg-sage/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export audit logs as CSV"
            >
              <Download className="w-4 h-4 text-textSecondaryLight" />
            </button>
          </div>
        </div>

{auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-textSecondaryLight">
              No audit logs found.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {auditLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  className="border border-borderMutedLight rounded-lg p-4 space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02, duration: 0.3 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getActionColor(log.action)}`}>
                        {log.action.toUpperCase()}
                      </span>
                      <span className="font-medium text-deepSage">
                        {log.table_name}
                      </span>
                    </div>
                    
                    <span className="text-xs text-textSecondaryLight">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  {log.record_id && (
                    <div className="text-sm text-textSecondaryLight">
                      Record ID: <code className="bg-sage/10 px-1 rounded">{log.record_id}</code>
                    </div>
                  )}
                  
                  {(log.old_values || log.new_values) && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-textSecondaryLight hover:text-deepSage">
                        View Changes
                      </summary>
                      <div className="mt-2 space-y-2">
                        {log.old_values && (
                          <div>
                            <span className="font-medium text-coral">Old:</span>
                            <pre className="text-xs bg-coral/5 p-2 rounded overflow-auto">
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <span className="font-medium text-teal">New:</span>
                            <pre className="text-xs bg-teal/5 p-2 rounded overflow-auto">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 pt-4 border-t border-borderMutedLight">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg bg-sage/10 text-deepSage disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage/20 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-textSecondaryLight">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg bg-sage/10 text-deepSage disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage/20 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
