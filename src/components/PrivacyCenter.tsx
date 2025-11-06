/**
 * Privacy Center Component
 * Implements 5 consent toggles with audit logging
 * As per consent_privacy_center_spec.md
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  MapPin,
  Eye,
  Bell,
  FlaskConical,
  AlertCircle,
  Check,
  X,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';
import api from '@/lib/api';

interface ConsentState {
  location: boolean;
  orb: boolean;
  reflections: boolean;
  notifications: boolean;
  research: boolean;
  [key: string]: boolean; // Allow string indexing for API compatibility
}

interface ReminderState {
  enabled: boolean;
  lastSent: string | null;
  count: number;
}

interface AuditLogEntry {
  consentType: string;
  action: string;
  previousValue: boolean | null;
  newValue: boolean | null;
  source: string;
  timestamp: string;
}

const CONSENT_INFO = {
  location: {
    title: 'Location Sharing',
    description: 'Share your approximate location to discover nearby programs and events',
    icon: MapPin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  orb: {
    title: 'Mood Orb Sharing',
    description: 'Include your mood data in anonymized community insights',
    icon: Eye,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  reflections: {
    title: 'Reflections Sharing',
    description: 'Share your reflections for research (with differential privacy)',
    icon: Eye,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  notifications: {
    title: 'Check-in Reminders',
    description: 'Receive gentle reminders and milestone celebrations',
    icon: Bell,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  research: {
    title: 'Research Participation',
    description: 'Help improve youth mental health through optional research studies',
    icon: FlaskConical,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
};

export default function PrivacyCenter() {
  const [consents, setConsents] = useState<ConsentState>({
    location: false,
    orb: false,
    reflections: false,
    notifications: false,
    research: false
  });
  
  const [reminder, setReminder] = useState<ReminderState>({
    enabled: false,
    lastSent: null,
    count: 0
  });
  
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load current consent settings
  useEffect(() => {
    loadConsents();
  }, []);

  async function loadConsents() {
    try {
      setLoading(true);
      const response = await api.privacy.getConsents();
      
      setConsents(response.consents);
      setReminder(response.reminder);
      setLastUpdated(response.lastUpdated);
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
      setError('Unable to load privacy settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLog() {
    try {
      const response = await api.privacy.getAuditLog();
      setAuditLog(response.logs);
    } catch (err) {
      console.error('Failed to load audit log:', err);
    }
  }

  async function updateConsent(type: keyof ConsentState, value: boolean) {
    const previousValue = consents[type];
    
    // Optimistically update UI
    setConsents(prev => ({ ...prev, [type]: value }));
    setSaving(true);
    setError(null);
    
    try {
      await api.privacy.updateConsents({
        consents: { ...consents, [type]: value } as Record<string, boolean>,
        reminderEnabled: reminder.enabled
      });
      
      // Show success feedback
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      // Revert on error
      setConsents(prev => ({ ...prev, [type]: previousValue }));
      setError('Failed to update privacy setting. Please try again.');
      setSaving(false);
    }
  }

  async function updateReminderSetting(enabled: boolean) {
    setReminder(prev => ({ ...prev, enabled }));
    setSaving(true);
    
    try {
      await api.privacy.updateConsents({
        consents: consents as Record<string, boolean>,
        reminderEnabled: enabled
      });
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      setReminder(prev => ({ ...prev, enabled: !enabled }));
      setError('Failed to update reminder setting.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-sage animate-pulse mx-auto" />
          <p className="text-textSecondaryLight">Loading privacy settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-sage/10 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-sage" />
        </div>
        <h1 className="text-2xl font-display font-bold text-deepSage">
          Privacy Center
        </h1>
        <p className="text-textSecondaryLight">
          You control your data. All settings default to OFF for your privacy.
        </p>
        {lastUpdated && (
          <p className="text-xs text-textSecondaryLight flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated: {new Date(lastUpdated).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="cosmic-card p-4 border-coral/20 bg-coral/5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
            <p className="text-sm text-deepSage">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Privacy Toggles */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-deepSage">Privacy Settings</h2>
        
        {Object.entries(CONSENT_INFO).map(([key, info]) => {
          const consentKey = key as keyof ConsentState;
          const isEnabled = consents[consentKey];
          const Icon = info.icon;
          
          return (
            <motion.div
              key={key}
              className="cosmic-card p-4 hover:shadow-md transition-shadow"
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${info.bgColor} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${info.color}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium text-deepSage">
                      {info.title}
                    </h3>
                    <p className="text-sm text-textSecondaryLight">
                      {info.description}
                    </p>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={() => updateConsent(consentKey, !isEnabled)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full
                    transition-colors duration-200 focus:outline-none focus:ring-2
                    focus:ring-sage focus:ring-offset-2
                    ${isEnabled ? 'bg-sage' : 'bg-gray-300'}
                  `}
                  disabled={saving}
                >
                  <span className="sr-only">
                    {isEnabled ? 'Disable' : 'Enable'} {info.title}
                  </span>
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white
                      transition-transform duration-200
                      ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
              
              {/* Status Indicator */}
              <div className="mt-3 flex items-center gap-2">
                {isEnabled ? (
                  <span className="text-xs text-sage flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Enabled
                  </span>
                ) : (
                  <span className="text-xs text-textSecondaryLight flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Disabled (default)
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Monthly Reminder Setting */}
      <div className="cosmic-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-deepSage">
                Monthly Privacy Reminder
              </h3>
              <p className="text-sm text-textSecondaryLight">
                Get a gentle monthly reminder to review your privacy settings
              </p>
              {reminder.lastSent && (
                <p className="text-xs text-textSecondaryLight">
                  Last reminder: {new Date(reminder.lastSent).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={() => updateReminderSetting(!reminder.enabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full
              transition-colors duration-200 focus:outline-none focus:ring-2
              focus:ring-sage focus:ring-offset-2
              ${reminder.enabled ? 'bg-sage' : 'bg-gray-300'}
            `}
            disabled={saving}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white
                transition-transform duration-200
                ${reminder.enabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Audit Log Button */}
      <button
        onClick={() => {
          setShowAuditLog(!showAuditLog);
          if (!showAuditLog) loadAuditLog();
        }}
        className="w-full cosmic-card p-4 hover:bg-sage/5 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-sage" />
            <span className="font-medium text-deepSage">
              View Privacy History
            </span>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-sage transition-transform ${
              showAuditLog ? 'rotate-90' : ''
            }`}
          />
        </div>
      </button>

      {/* Audit Log */}
      <AnimatePresence>
        {showAuditLog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="cosmic-card p-4 space-y-3"
          >
            <h3 className="font-medium text-deepSage mb-3">Privacy History</h3>
            
            {auditLog.length === 0 ? (
              <p className="text-sm text-textSecondaryLight text-center py-4">
                No privacy changes recorded yet
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLog.map((entry, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-deepSage">
                        {CONSENT_INFO[entry.consentType as keyof typeof CONSENT_INFO]?.title || entry.consentType}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        entry.action === 'granted' 
                          ? 'bg-green-100 text-green-700'
                          : entry.action === 'revoked'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {entry.action}
                      </span>
                    </div>
                    <div className="text-xs text-textSecondaryLight">
                      {new Date(entry.timestamp).toLocaleString()}
                      {entry.source && ` • via ${entry.source}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Notice */}
      <div className="cosmic-card p-4 bg-blue-50/50 border-blue-200/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-textSecondaryLight">
            <p>
              <strong className="text-deepSage">Your privacy matters.</strong> All data sharing 
              is protected with differential privacy, ensuring your individual information 
              cannot be identified even in aggregated data.
            </p>
            <p>
              You can change these settings at any time. Disabling a setting immediately 
              stops that type of data sharing.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <p className="text-xs text-center text-textSecondaryLight italic">
        Mood visuals are self-reported reflections, not diagnostic indicators.
      </p>
    </div>
  );
}

export { PrivacyCenter };