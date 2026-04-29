import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '../lib/api';

interface ConsentSummary {
  total: number;
  pending: number;
  signed: number;
  declined: number;
  withdrawn: number;
  expired: number;
}

interface ConsentItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

const STATUS_PILLS: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  signed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  declined: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  withdrawn: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle },
  expired: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock },
};

export default function ConsentWalletStatus() {
  const [summary, setSummary] = useState<ConsentSummary | null>(null);
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const { data } = await api.consentWallet.getYouthStatus();
      if (data) {
        setSummary(data.summary);
        setConsents(data.consents || []);
      }
    } catch (err) {
      console.error('Failed to load consent wallet status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cosmic-card p-6 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sage/10 rounded-lg" />
          <div className="h-5 bg-sage/10 rounded w-40" />
        </div>
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return null;
  }

  const overallStatus = summary.pending > 0
    ? 'pending'
    : summary.signed > 0
    ? 'signed'
    : 'none';

  return (
    <motion.div
      className="cosmic-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.6 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-teal" />
          </div>
          <div>
            <h3 className="font-semibold text-deepSage">Consent Status</h3>
            <p className="text-xs text-textSecondaryLight">
              {summary.pending > 0
                ? `${summary.pending} awaiting parent review`
                : summary.signed > 0
                ? `${summary.signed} active consent${summary.signed !== 1 ? 's' : ''}`
                : 'No active consents'}
            </p>
          </div>
        </div>
        {overallStatus === 'pending' && (
          <span className="text-xs font-medium px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
            Pending
          </span>
        )}
        {overallStatus === 'signed' && (
          <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
            Active
          </span>
        )}
      </div>

      {consents.length > 0 && (
        <div className="space-y-2">
          {consents.slice(0, 5).map((item) => {
            const pill = STATUS_PILLS[item.status] || STATUS_PILLS.pending;
            const PillIcon = pill.icon;
            return (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-sage/10 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-deepSage truncate">{item.name}</p>
                  <p className="text-xs text-textSecondaryLight capitalize">{item.type.replace(/_/g, ' ')}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
                  <PillIcon className="w-3 h-3" />
                  {item.status}
                </span>
              </div>
            );
          })}
          {consents.length > 5 && (
            <p className="text-xs text-textSecondaryLight text-center pt-1">
              +{consents.length - 5} more
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
