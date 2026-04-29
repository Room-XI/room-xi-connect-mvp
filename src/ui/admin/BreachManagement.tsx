import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  X,
  Clock,
  Edit3,
} from 'lucide-react';
import { api } from '@/lib/api';

interface BreachEvent {
  id: string;
  breachType: string;
  severity: string;
  affectedUserCount: number | null;
  description: string;
  oipcNotificationRequired: boolean;
  oipcNotifiedAt: string | null;
  oipcReferenceNumber: string | null;
  remediationSteps: string | null;
  remediationCompletedAt: string | null;
  discoveredAt: string;
  createdAt: string;
  updatedAt: string;
}

const BREACH_TYPES = [
  { value: 'unauthorized_access', label: 'Unauthorized Access' },
  { value: 'data_loss', label: 'Data Loss' },
  { value: 'ransomware', label: 'Ransomware' },
  { value: 'insider_threat', label: 'Insider Threat' },
  { value: 'accidental_disclosure', label: 'Accidental Disclosure' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: 'text-sageText bg-sage/10' },
  { value: 'medium', label: 'Medium', color: 'text-gold bg-gold/10' },
  { value: 'high', label: 'High', color: 'text-coralText bg-coral/10' },
  { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-100' },
];

export function BreachManagement() {
  const [breaches, setBreaches] = useState<BreachEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBreach, setEditingBreach] = useState<BreachEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newBreach, setNewBreach] = useState({
    breachType: 'unauthorized_access',
    severity: 'medium',
    description: '',
    affectedUserCount: 0,
    oipcNotificationRequired: false,
  });

  const [updateData, setUpdateData] = useState({
    oipcNotifiedAt: '',
    oipcReferenceNumber: '',
    remediationSteps: '',
    remediationCompletedAt: '',
  });

  useEffect(() => {
    loadBreaches();
  }, []);

  const loadBreaches = async () => {
    try {
      setLoading(true);
      const { data, error: apiError } = await api.breach.list();
      if (apiError) throw new Error(apiError);
      setBreaches(data?.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreach.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const { error: apiError } = await api.breach.create(newBreach);
      if (apiError) throw new Error(apiError);
      
      await loadBreaches();
      setShowCreateForm(false);
      setNewBreach({
        breachType: 'unauthorized_access',
        severity: 'medium',
        description: '',
        affectedUserCount: 0,
        oipcNotificationRequired: false,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBreach) return;

    const updates: Record<string, any> = {};
    if (updateData.oipcNotifiedAt) updates.oipcNotifiedAt = new Date(updateData.oipcNotifiedAt).toISOString();
    if (updateData.oipcReferenceNumber) updates.oipcReferenceNumber = updateData.oipcReferenceNumber;
    if (updateData.remediationSteps) updates.remediationSteps = updateData.remediationSteps;
    if (updateData.remediationCompletedAt) updates.remediationCompletedAt = new Date(updateData.remediationCompletedAt).toISOString();

    if (Object.keys(updates).length === 0) {
      setError('Please fill in at least one field to update');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const { error: apiError } = await api.breach.update(editingBreach.id, updates);
      if (apiError) throw new Error(apiError);
      
      await loadBreaches();
      setEditingBreach(null);
      setUpdateData({
        oipcNotifiedAt: '',
        oipcReferenceNumber: '',
        remediationSteps: '',
        remediationCompletedAt: '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (breach: BreachEvent) => {
    setEditingBreach(breach);
    setUpdateData({
      oipcNotifiedAt: breach.oipcNotifiedAt ? breach.oipcNotifiedAt.split('T')[0] : '',
      oipcReferenceNumber: breach.oipcReferenceNumber || '',
      remediationSteps: breach.remediationSteps || '',
      remediationCompletedAt: breach.remediationCompletedAt ? breach.remediationCompletedAt.split('T')[0] : '',
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getSeverityStyle = (severity: string) => {
    const found = SEVERITIES.find(s => s.value === severity);
    return found?.color || 'text-sageText bg-sage/10';
  };

  const getBreachTypeLabel = (type: string) => {
    const found = BREACH_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  if (loading) {
    return (
      <div className="cosmic-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-sage/10 rounded w-1/3 mb-4" />
          <div className="h-32 bg-sage/10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-deepSage flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-coralText" />
          <span>Breach Management (PIPA Compliance)</span>
        </h2>
        <motion.button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          <span>New Breach Event</span>
        </motion.button>
      </div>

      {error && (
        <div className="bg-coral/10 text-coralText px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showCreateForm && (
        <motion.div
          className="cosmic-card p-6 border-2 border-coral/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="font-semibold text-deepSage mb-4">Create New Breach Event</h3>
          <form onSubmit={handleCreateBreach} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">
                  Breach Type
                </label>
                <select
                  value={newBreach.breachType}
                  onChange={(e) => setNewBreach({ ...newBreach, breachType: e.target.value })}
                  className="w-full px-3 py-2 border border-borderMutedLight rounded-lg bg-surface"
                >
                  {BREACH_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">
                  Severity
                </label>
                <select
                  value={newBreach.severity}
                  onChange={(e) => setNewBreach({ ...newBreach, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-borderMutedLight rounded-lg bg-surface"
                >
                  {SEVERITIES.map((sev) => (
                    <option key={sev.value} value={sev.value}>
                      {sev.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-deepSage mb-1">
                Description *
              </label>
              <textarea
                value={newBreach.description}
                onChange={(e) => setNewBreach({ ...newBreach, description: e.target.value })}
                className="w-full px-3 py-2 border border-borderMutedLight rounded-lg bg-surface min-h-[100px]"
                placeholder="Describe the breach incident..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">
                  Affected User Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={newBreach.affectedUserCount}
                  onChange={(e) => setNewBreach({ ...newBreach, affectedUserCount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-borderMutedLight rounded-lg bg-surface"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBreach.oipcNotificationRequired}
                    onChange={(e) => setNewBreach({ ...newBreach, oipcNotificationRequired: e.target.checked })}
                    className="w-4 h-4 text-coralText border-borderMutedLight rounded focus:ring-coral"
                  />
                  <span className="text-sm font-medium text-deepSage">
                    OIPC Notification Required
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-textSecondaryLight hover:text-deepSage transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Breach Event'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {editingBreach && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setEditingBreach(null)}
        >
          <motion.div
            className="cosmic-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-deepSage">Update Breach Event</h3>
              <button onClick={() => setEditingBreach(null)} className="text-textSecondaryLight hover:text-deepSage">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-sage/5 rounded-lg">
              <p className="text-sm text-textSecondaryLight">
                <strong>Type:</strong> {getBreachTypeLabel(editingBreach.breachType)}
              </p>
              <p className="text-sm text-textSecondaryLight">
                <strong>Discovered:</strong> {formatDate(editingBreach.discoveredAt)}
              </p>
            </div>

            <form onSubmit={handleUpdateBreach} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">
                  OIPC Notified At
                </label>
                <input
                  type="date"
                  value={updateData.oipcNotifiedAt}
                  onChange={(e) => setUpdateData({ ...updateData, oipcNotifiedAt: e.target.value })}
                  className="w-full px-3 py-2 border border-borderMutedLight rounded-lg bg-surface"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">
                  OIPC Reference Number
                </label>
                <input
                  type="text"
                  value={updateData.oipcReferenceNumber}
                  onChange={(e) => setUpdateData({ ...updateData, oipcReferenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-borderMutedLight rounded-lg bg-surface"
                  placeholder="e.g., OIPC-2025-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">
                  Remediation Steps
                </label>
                <textarea
                  value={updateData.remediationSteps}
                  onChange={(e) => setUpdateData({ ...updateData, remediationSteps: e.target.value })}
                  className="w-full px-3 py-2 border border-borderMutedLight rounded-lg bg-surface min-h-[100px]"
                  placeholder="Describe remediation actions taken..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deepSage mb-1">
                  Remediation Completed At
                </label>
                <input
                  type="date"
                  value={updateData.remediationCompletedAt}
                  onChange={(e) => setUpdateData({ ...updateData, remediationCompletedAt: e.target.value })}
                  className="w-full px-3 py-2 border border-borderMutedLight rounded-lg bg-surface"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-borderMutedLight">
                <button
                  type="button"
                  onClick={() => setEditingBreach(null)}
                  className="px-4 py-2 text-textSecondaryLight hover:text-deepSage transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Updating...' : 'Update Breach'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {breaches.length === 0 ? (
        <div className="cosmic-card p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-sage/50 mx-auto mb-3" />
          <p className="text-textSecondaryLight">No breach events recorded.</p>
          <p className="text-sm text-sageText mt-1">Breach events will appear here when created.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {breaches.map((breach, index) => (
            <motion.div
              key={breach.id}
              className="cosmic-card p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSeverityStyle(breach.severity)}`}>
                      {breach.severity.toUpperCase()}
                    </span>
                    <span className="font-medium text-deepSage">
                      {getBreachTypeLabel(breach.breachType)}
                    </span>
                  </div>

                  <p className="text-sm text-textSecondaryLight line-clamp-2">
                    {breach.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-textSecondaryLight">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Discovered: {formatDate(breach.discoveredAt)}</span>
                    </span>

                    {breach.affectedUserCount !== null && breach.affectedUserCount > 0 && (
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{breach.affectedUserCount} affected</span>
                      </span>
                    )}

                    {breach.oipcNotificationRequired && (
                      <span className={`flex items-center space-x-1 ${breach.oipcNotifiedAt ? 'text-teal' : 'text-coralText'}`}>
                        {breach.oipcNotifiedAt ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>OIPC Notified</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>OIPC Pending</span>
                          </>
                        )}
                      </span>
                    )}

                    {breach.remediationCompletedAt && (
                      <span className="flex items-center space-x-1 text-teal">
                        <CheckCircle className="w-3 h-3" />
                        <span>Remediated</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openEditModal(breach)}
                  className="p-2 text-textSecondaryLight hover:text-deepSage hover:bg-sage/10 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="text-xs text-textSecondaryLight bg-sage/5 p-3 rounded-lg">
        <strong>PIPA Compliance:</strong> Alberta PIPA requires notification to the OIPC within 72 hours of discovering a breach that poses a real risk of significant harm.
      </div>
    </div>
  );
}
