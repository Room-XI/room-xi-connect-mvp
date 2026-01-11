import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react';
import { api } from '@/lib/api';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_TYPES = ['all', 'INSERT', 'UPDATE', 'DELETE'];

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await api.admin.getAuditLogs({
        page: pagination.page,
        limit: pagination.limit,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      if (error) throw new Error(error);
      setLogs(data?.logs || []);
      if (data?.pagination) {
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, actionFilter, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const exportCSV = () => {
    if (logs.length === 0) return;

    const escapeCSV = (value: string): string => {
      if (
        value.includes('"') ||
        value.includes(',') ||
        value.includes('\n') ||
        value.includes('\r')
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return `"${value}"`;
    };

    const headers = [
      'ID',
      'Action',
      'Table',
      'Record ID',
      'Timestamp',
      'User ID',
      'Old Values',
      'New Values'
    ];
    const csvRows = [headers.map((h) => escapeCSV(h)).join(',')];

    logs.forEach((log) => {
      const row = [
        log.id,
        log.action,
        log.table_name,
        log.record_id || '',
        log.timestamp,
        log.user_id || '',
        log.old_values ? JSON.stringify(log.old_values) : '',
        log.new_values ? JSON.stringify(log.new_values) : ''
      ];
      csvRows.push(row.map((cell) => escapeCSV(String(cell))).join(','));
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

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'INSERT':
        return 'bg-teal/10 text-teal';
      case 'UPDATE':
        return 'bg-gold/10 text-gold';
      case 'DELETE':
        return 'bg-coral/10 text-coral';
      default:
        return 'bg-sage/10 text-sage';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-deepSage">Audit Logs</h1>
          <p className="text-textSecondaryLight mt-1">
            System activity and change history
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <motion.div
        className="cosmic-card p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-textSecondaryLight mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Actions' : type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondaryLight mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondaryLight mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>

          {(actionFilter !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setActionFilter('all');
                setStartDate('');
                setEndDate('');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 text-sm text-teal hover:bg-teal/10 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </motion.div>

      <motion.div
        className="cosmic-card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-teal animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-sage/40 mx-auto mb-4" />
            <p className="text-textSecondaryLight">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sage/5 border-b border-borderMutedLight">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      Timestamp
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      Action
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      Table
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      Record ID
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                      User
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-borderMutedLight last:border-0 hover:bg-sage/5 transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-sm text-deepSage">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-deepSage font-mono">
                          {log.table_name}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-textSecondaryLight font-mono truncate max-w-[120px] block">
                          {log.record_id || '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-textSecondaryLight font-mono truncate max-w-[120px] block">
                          {log.user_id || 'System'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-borderMutedLight">
                <span className="text-sm text-textSecondaryLight">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1)
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg hover:bg-sage/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.min(prev.totalPages, prev.page + 1)
                      }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-lg hover:bg-sage/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
