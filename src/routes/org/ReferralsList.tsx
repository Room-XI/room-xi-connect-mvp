import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Download,
  Send
} from 'lucide-react';
import { api } from '@/lib/api';

interface Referral {
  id: string;
  youthName: string;
  youthId: string;
  toOrgName: string;
  toOrgId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending_consent' | 'pending' | 'accepted' | 'declined' | 'expired';
  summary: string;
  createdAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  declinedReason: string | null;
}

const statusConfig = {
  pending_consent: { label: 'Awaiting Consent', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  pending: { label: 'Pending', icon: Send, color: 'text-blue-600 bg-blue-50' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-red-600 bg-red-50' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'text-gray-600 bg-gray-50' }
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-600 bg-gray-100' },
  medium: { label: 'Medium', color: 'text-amber-600 bg-amber-100' },
  high: { label: 'High', color: 'text-red-600 bg-red-100' }
};

export default function ReferralsList() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, [statusFilter]);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const response = await api.get<{ referrals: Referral[] }>(`/org/referrals?${params}`);
      if (response.data) {
        setReferrals(response.data.referrals);
      } else {
        throw new Error(response.error || 'Failed to load');
      }
    } catch (err) {
      setError('Failed to load referrals');
      console.error('Error loading referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const response = await fetch(`/api/org/referrals/export?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `referrals-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export referrals');
    }
  };

  const filteredReferrals = referrals.filter(r => 
    r.youthName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.toOrgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/org/dashboard" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Referrals</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <Link
                to="/org/referrals/new"
                className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90"
              >
                <Plus className="w-4 h-4" />
                New Referral
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search referrals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${
                    showFilters ? 'border-teal text-teal bg-teal/5' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 flex flex-wrap gap-2">
                    <span className="text-sm text-gray-500 mr-2">Status:</span>
                    {['all', 'pending_consent', 'pending', 'accepted', 'declined', 'expired'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          statusFilter === status
                            ? 'bg-teal text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'all' ? 'All' : statusConfig[status as keyof typeof statusConfig]?.label || status}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 mt-4">Loading referrals...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadReferrals}
                className="mt-4 px-4 py-2 text-teal hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="p-12 text-center">
              <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No referrals found</p>
              <Link
                to="/org/referrals/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90"
              >
                <Plus className="w-4 h-4" />
                Create your first referral
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Youth</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Organization</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReferrals.map((referral) => {
                    const statusInfo = statusConfig[referral.status];
                    const priorityInfo = priorityConfig[referral.priority];
                    const StatusIcon = statusInfo?.icon || Clock;
                    
                    return (
                      <tr key={referral.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{referral.youthName}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                          {referral.toOrgName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityInfo?.color || 'bg-gray-100'}`}>
                            {priorityInfo?.label || referral.priority}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${statusInfo?.color || 'bg-gray-100'}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusInfo?.label || referral.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(referral.createdAt)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {referral.summary || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
