import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  Eye,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/session';

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
  total_users: number;
  total_checkins: number;
  total_programs: number;
  total_attendance: number;
}

export default function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('all');

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      
      // Check if user has admin role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user!.id)
        .single();

      if (error || !profile || profile.role !== 'admin') {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);
      await Promise.all([loadAuditLogs(), loadStats()]);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading audit logs:', error);
        return;
      }

      setAuditLogs(data || []);
    } catch (error) {
      console.error('Unexpected error loading audit logs:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Get basic stats (these queries are safe for admins)
      const [usersResult, checkinsResult, programsResult, attendanceResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('checkins').select('id', { count: 'exact', head: true }),
        supabase.from('programs').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        total_users: usersResult.count || 0,
        total_checkins: checkinsResult.count || 0,
        total_programs: programsResult.count || 0,
        total_attendance: attendanceResult.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
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

  const filteredLogs = selectedAction === 'all' 
    ? auditLogs 
    : auditLogs.filter(log => log.action.toLowerCase() === selectedAction.toLowerCase());

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
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-coral" />
          <h1 className="text-2xl font-display font-bold text-deepSage">
            Admin Panel
          </h1>
        </div>
        <p className="text-textSecondaryLight">
          System overview and audit logs
        </p>
      </motion.div>

      {/* Stats Grid */}
      {stats && (
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <div className="cosmic-card p-4 text-center">
            <Users className="w-6 h-6 text-teal mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.total_users}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Total Users
            </div>
          </div>
          
          <div className="cosmic-card p-4 text-center">
            <Activity className="w-6 h-6 text-gold mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.total_checkins}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Check-ins
            </div>
          </div>
          
          <div className="cosmic-card p-4 text-center">
            <Calendar className="w-6 h-6 text-sage mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.total_programs}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Programs
            </div>
          </div>
          
          <div className="cosmic-card p-4 text-center">
            <Eye className="w-6 h-6 text-coral mx-auto mb-2" />
            <div className="text-2xl font-bold text-deepSage">
              {stats.total_attendance}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Attendance
            </div>
          </div>
        </motion.div>
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
            <button className="p-2 rounded-lg hover:bg-sage/10 transition-colors">
              <Download className="w-4 h-4 text-textSecondaryLight" />
            </button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-textSecondaryLight">
              No audit logs found.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredLogs.map((log, index) => (
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
        )}
      </motion.div>
    </div>
  );
}
