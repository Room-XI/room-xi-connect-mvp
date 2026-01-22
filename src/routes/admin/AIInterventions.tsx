import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Plus,
  Edit2,
  Power,
  Play,
  X,
  AlertTriangle,
  Bell,
  Mail,
  Smartphone,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

interface Intervention {
  id: string;
  interventionType: string;
  content: string;
  triggerConditions: object;
  deliveryChannel: string;
  cooldownPeriodHours: number;
  active: boolean;
  createdAt: string;
}

const INTERVENTION_TYPES = [
  { value: 'mood_decline', label: 'Mood Decline' },
  { value: 'inactivity', label: 'Inactivity' },
  { value: 'crisis_keyword', label: 'Crisis Keyword' },
  { value: 'low_engagement', label: 'Low Engagement' },
  { value: 'streak_encouragement', label: 'Streak Encouragement' },
];

const DELIVERY_CHANNELS = [
  { value: 'in_app_notification', label: 'In-App Notification', icon: Bell },
  { value: 'push', label: 'Push Notification', icon: Smartphone },
  { value: 'email', label: 'Email', icon: Mail },
];

export default function AIInterventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [saving, setSaving] = useState(false);
  const [triggeringEngine, setTriggeringEngine] = useState(false);
  const [engineResult, setEngineResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    interventionType: 'mood_decline',
    content: '',
    triggerConditions: '{}',
    deliveryChannel: 'in_app_notification',
    cooldownPeriodHours: 24,
    active: true,
  });

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    try {
      setLoading(true);
      const { data, error: apiError } = await api.admin.getInterventions();
      if (apiError) throw new Error(apiError);
      setInterventions(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load interventions');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingIntervention(null);
    setFormData({
      interventionType: 'mood_decline',
      content: '',
      triggerConditions: '{}',
      deliveryChannel: 'in_app_notification',
      cooldownPeriodHours: 24,
      active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (intervention: Intervention) => {
    setEditingIntervention(intervention);
    setFormData({
      interventionType: intervention.interventionType,
      content: intervention.content,
      triggerConditions: JSON.stringify(intervention.triggerConditions, null, 2),
      deliveryChannel: intervention.deliveryChannel,
      cooldownPeriodHours: intervention.cooldownPeriodHours,
      active: intervention.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let triggerConditions;
      try {
        triggerConditions = JSON.parse(formData.triggerConditions);
      } catch {
        alert('Invalid JSON in trigger conditions');
        setSaving(false);
        return;
      }

      const payload = {
        interventionType: formData.interventionType,
        content: formData.content,
        triggerConditions,
        deliveryChannel: formData.deliveryChannel,
        cooldownPeriodHours: formData.cooldownPeriodHours,
        active: formData.active,
      };

      if (editingIntervention) {
        const { error: apiError } = await api.admin.updateIntervention(editingIntervention.id, payload);
        if (apiError) throw new Error(apiError);
      } else {
        const { error: apiError } = await api.admin.createIntervention(payload);
        if (apiError) throw new Error(apiError);
      }

      setModalOpen(false);
      loadInterventions();
    } catch (err: any) {
      alert(err.message || 'Failed to save intervention');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (intervention: Intervention) => {
    try {
      const { error: apiError } = await api.admin.updateIntervention(intervention.id, {
        ...intervention,
        active: !intervention.active,
      });
      if (apiError) throw new Error(apiError);
      loadInterventions();
    } catch (err: any) {
      alert(err.message || 'Failed to update intervention');
    }
  };

  const triggerAIEngine = async () => {
    setTriggeringEngine(true);
    setEngineResult(null);
    try {
      const { data, error: apiError } = await api.admin.triggerAIEngine();
      if (apiError) throw new Error(apiError);
      setEngineResult(data);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger AI engine');
    } finally {
      setTriggeringEngine(false);
    }
  };

  const truncateContent = (content: string, maxLength = 60) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getChannelIcon = (channel: string) => {
    const found = DELIVERY_CHANNELS.find(c => c.value === channel);
    return found?.icon || Bell;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-sage/10 rounded w-48 animate-pulse" />
        <div className="cosmic-card p-6 animate-pulse">
          <div className="h-64 bg-sage/10 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cosmic-card p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-coral mx-auto mb-4" />
        <p className="text-coral">{error}</p>
        <button
          onClick={loadInterventions}
          className="mt-4 px-4 py-2 bg-teal text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-deepSage flex items-center gap-2">
            <Brain className="w-7 h-7 text-teal" />
            AI Interventions
          </h1>
          <p className="text-textSecondaryLight mt-1">
            Manage proactive AI intervention rules
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={triggerAIEngine}
            disabled={triggeringEngine}
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold hover:bg-gold/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {triggeringEngine ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run AI Engine
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Intervention
          </button>
        </div>
      </div>

      {engineResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-4 bg-gold/5 border-gold/20"
        >
          <h3 className="font-semibold text-deepSage mb-2">AI Engine Result</h3>
          <pre className="text-sm text-textSecondaryLight overflow-auto max-h-40">
            {JSON.stringify(engineResult, null, 2)}
          </pre>
          <button
            onClick={() => setEngineResult(null)}
            className="mt-2 text-sm text-gold hover:underline"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      <motion.div
        className="cosmic-card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-sage/5 border-b border-sage/10">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-deepSage">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-deepSage">Content</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-deepSage">Channel</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-deepSage">Cooldown</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-deepSage">Active</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-deepSage">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {interventions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-textSecondaryLight">
                    No interventions configured yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                interventions.map((intervention, index) => {
                  const ChannelIcon = getChannelIcon(intervention.deliveryChannel);
                  return (
                    <motion.tr
                      key={intervention.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-sage/5"
                    >
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal/10 text-teal">
                          {INTERVENTION_TYPES.find(t => t.value === intervention.interventionType)?.label || intervention.interventionType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-textSecondaryLight max-w-xs">
                        {truncateContent(intervention.content)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
                          <ChannelIcon className="w-4 h-4" />
                          {DELIVERY_CHANNELS.find(c => c.value === intervention.deliveryChannel)?.label || intervention.deliveryChannel}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-textSecondaryLight">
                        {intervention.cooldownPeriodHours}h
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleActive(intervention)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            intervention.active
                              ? 'bg-teal/10 text-teal hover:bg-teal/20'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={intervention.active ? 'Disable' : 'Enable'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(intervention)}
                          className="p-2 text-textSecondaryLight hover:text-deepSage hover:bg-sage/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-sage/10">
                <h2 className="text-lg font-semibold text-deepSage">
                  {editingIntervention ? 'Edit Intervention' : 'Create Intervention'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-sage/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Intervention Type
                  </label>
                  <select
                    value={formData.interventionType}
                    onChange={(e) => setFormData({ ...formData, interventionType: e.target.value })}
                    className="w-full px-3 py-2 border border-sage/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/50"
                  >
                    {INTERVENTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-sage/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/50 resize-none"
                    placeholder="Enter the intervention message content..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Trigger Conditions (JSON)
                  </label>
                  <textarea
                    value={formData.triggerConditions}
                    onChange={(e) => setFormData({ ...formData, triggerConditions: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-sage/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/50 resize-none font-mono text-sm"
                    placeholder='{"threshold": 3, "dayWindow": 7}'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Delivery Channel
                  </label>
                  <select
                    value={formData.deliveryChannel}
                    onChange={(e) => setFormData({ ...formData, deliveryChannel: e.target.value })}
                    className="w-full px-3 py-2 border border-sage/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/50"
                  >
                    {DELIVERY_CHANNELS.map((channel) => (
                      <option key={channel.value} value={channel.value}>
                        {channel.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Cooldown Period (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.cooldownPeriodHours}
                    onChange={(e) => setFormData({ ...formData, cooldownPeriodHours: parseInt(e.target.value) || 24 })}
                    min={1}
                    className="w-full px-3 py-2 border border-sage/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/50"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal"></div>
                  </label>
                  <span className="text-sm font-medium text-deepSage">Active</span>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-sage/20 text-textSecondaryLight rounded-lg hover:bg-sage/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingIntervention ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
