import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Settings, Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, Bell } from 'lucide-react';
import { api } from '@/lib/api';

interface NotificationPreferences {
  consentRequests: boolean;
  referrals: boolean;
  documents: boolean;
  moodAlerts: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  consentRequests: true,
  referrals: true,
  documents: true,
  moodAlerts: true,
};

export default function ParentSettings() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await api.parentPortal.getNotificationPreferences();
        if (res.data?.preferences) {
          setNotifPrefs(res.data.preferences);
        }
      } catch {
      } finally {
        setNotifLoading(false);
      }
    }
    loadPrefs();
  }, []);

  async function togglePref(key: keyof NotificationPreferences) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setNotifSaving(key);
    try {
      await api.parentPortal.updateNotificationPreferences(updated);
    } catch {
      setNotifPrefs(notifPrefs);
    } finally {
      setNotifSaving(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError(t('parentSettings.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('parentSettings.passwordMismatch'));
      return;
    }

    setSaving(true);
    try {
      const res = await api.parent.changePassword(currentPassword, newPassword);
      if (res.error) {
        setError(res.friendlyError || res.error || t('parentSettings.changeError'));
      } else {
        setSuccess(t('parentSettings.changeSuccess'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch {
      setError(t('parentSettings.changeError'));
    } finally {
      setSaving(false);
    }
  }

  const notifOptions: { key: keyof NotificationPreferences; label: string; description: string }[] = [
    { key: 'consentRequests', label: 'Consent Requests', description: 'When a program requests consent' },
    { key: 'referrals', label: 'Referrals', description: 'When a referral involves your child' },
    { key: 'documents', label: 'Documents', description: 'When new documents need signing' },
    { key: 'moodAlerts', label: 'Mood Alerts', description: 'When mood patterns need attention' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-textPrimaryLight flex items-center gap-3">
          <Settings className="w-7 h-7 text-teal" />
          {t('parentSettings.title')}
        </h1>
        <p className="text-textSecondaryLight mt-1">{t('parentSettings.subtitle')}</p>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-6 flex items-center gap-3 bg-teal/10 border border-teal/30 text-teal rounded-xl px-4 py-3"
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-6 flex items-center gap-3 bg-coral/10 border border-coral/30 text-coralText rounded-xl px-4 py-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <div className="bg-surface rounded-2xl border border-borderMutedLight p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-teal" />
          <h2 className="text-lg font-semibold text-textPrimaryLight">Notification Preferences</h2>
        </div>

        {notifLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-teal" />
          </div>
        ) : (
          <div className="space-y-4">
            {notifOptions.map((opt) => (
              <div key={opt.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-textPrimaryLight">{opt.label}</p>
                  <p className="text-xs text-textSecondaryLight">{opt.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePref(opt.key)}
                  disabled={notifSaving === opt.key}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifPrefs[opt.key] ? 'bg-teal' : 'bg-gray-300'
                  } ${notifSaving === opt.key ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifPrefs[opt.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-borderMutedLight p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-teal" />
          <h2 className="text-lg font-semibold text-textPrimaryLight">{t('parentSettings.changePassword')}</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-textPrimaryLight mb-1.5">
            {t('parentSettings.currentPassword')}
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 pr-12 border border-borderMutedLight rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondaryLight hover:text-textPrimaryLight transition"
            >
              {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-textPrimaryLight mb-1.5">
            {t('parentSettings.newPassword')}
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 pr-12 border border-borderMutedLight rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondaryLight hover:text-textPrimaryLight transition"
            >
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-textSecondaryLight mt-1">{t('parentSettings.passwordHint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-textPrimaryLight mb-1.5">
            {t('parentSettings.confirmPassword')}
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 pr-12 border border-borderMutedLight rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondaryLight hover:text-textPrimaryLight transition"
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal text-white rounded-xl font-medium hover:bg-teal/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
            {t('parentSettings.updatePassword')}
          </button>
        </div>
      </form>
    </div>
  );
}
