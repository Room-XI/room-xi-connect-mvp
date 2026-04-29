import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

export default function AccountSecurity() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'password' | 'email' | 'sessions'>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('settings.allFieldsRequired') || 'All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setError(t('settings.passwordMinLength') || 'Password must be at least 12 characters');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError(t('settings.passwordNeedsUppercase') || 'Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError(t('settings.passwordNeedsLowercase') || 'Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError(t('settings.passwordNeedsNumber') || 'Password must contain at least one number');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setError(t('settings.passwordNeedsSpecial') || 'Password must contain at least one special character');
      return;
    }

    try {
      setLoading(true);
      const { error: apiError } = await api.auth.changePassword(currentPassword, newPassword);

      if (apiError) {
        setError(apiError || t('settings.failedChangePassword') || 'Failed to change password');
        return;
      }

      setSuccess(t('settings.passwordChangedSuccess') || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(t('settings.unexpectedError') || 'An unexpected error occurred');
      console.error('Error changing password:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="cosmic-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.6 }}
    >
      <h3 className="font-semibold text-deepSage flex items-center gap-2">
        <Lock className="w-5 h-5 text-teal" />
        {t('settings.accountSecurity')}
      </h3>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-sage/20">
        <button
          onClick={() => {
            setActiveTab('password');
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'password'
              ? 'text-teal border-teal'
              : 'text-textSecondaryLight border-transparent hover:text-deepSage'
          }`}
        >
          {t('settings.password')}
        </button>
        <button
          onClick={() => {
            setActiveTab('email');
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'email'
              ? 'text-teal border-teal'
              : 'text-textSecondaryLight border-transparent hover:text-deepSage'
          }`}
        >
          {t('settings.email')}
        </button>
        <button
          onClick={() => {
            setActiveTab('sessions');
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'sessions'
              ? 'text-teal border-teal'
              : 'text-textSecondaryLight border-transparent hover:text-deepSage'
          }`}
        >
          {t('settings.sessions')}
        </button>
      </div>

      {/* Password Tab */}
      {activeTab === 'password' && (
        <motion.form
          onSubmit={handlePasswordChange}
          className="space-y-4 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm text-textSecondaryLight">
            {t('settings.changePasswordDesc') ||
              'For security, please enter your current password and a new password with at least 12 characters, including uppercase, lowercase, numbers, and special characters.'}
          </p>

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-deepSage mb-2">
              {t('settings.currentPassword')}
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-sage/20 rounded-lg focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10 bg-cream"
                placeholder={t('settings.enterCurrentPassword') || 'Enter your current password'}
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    current: !prev.current,
                  }))
                }
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textSecondaryLight hover:text-deepSage"
              >
                {showPasswords.current ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-deepSage mb-2">
              {t('settings.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-sage/20 rounded-lg focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10 bg-cream"
                placeholder={t('settings.enterNewPassword') || 'Enter your new password'}
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    new: !prev.new,
                  }))
                }
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textSecondaryLight hover:text-deepSage"
              >
                {showPasswords.new ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-deepSage mb-2">
              {t('settings.confirmPassword')}
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-sage/20 rounded-lg focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10 bg-cream"
                placeholder={t('settings.confirmNewPassword') || 'Confirm your new password'}
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    confirm: !prev.confirm,
                  }))
                }
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textSecondaryLight hover:text-deepSage"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-coral/10 border border-coral/20 rounded-lg"
            >
              <p className="text-sm text-coralText">{error}</p>
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-teal/10 border border-teal/20 rounded-lg"
            >
              <p className="text-sm text-teal">{success}</p>
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {t('settings.updatePassword')}
          </button>
        </motion.form>
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <motion.div
          className="space-y-4 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm text-textSecondaryLight">
            {t('settings.changeEmailDesc') ||
              'Email change functionality coming soon. For now, please contact support if you need to update your email address.'}
          </p>
          <div className="p-4 bg-sage/5 border border-sage/20 rounded-lg">
            <p className="text-sm text-deepSage">
              {t('settings.emailChangeNote') || 'Email change is not yet available. Please contact our support team for assistance.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <motion.div
          className="space-y-4 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm text-textSecondaryLight">
            {t('settings.sessionsDesc') || 'View and manage your active sessions.'}
          </p>

          {/* Current Session Indicator */}
          <div className="p-4 bg-teal/5 border border-teal/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-teal rounded-full" />
              <span className="font-medium text-deepSage">
                {t('settings.currentSession') || 'This Device (Current Session)'}
              </span>
            </div>
            <p className="text-sm text-textSecondaryLight ml-4">
              {t('settings.youreSignedInDevice') ||
                'You are currently signed in on this device.'}
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={async () => {
              try {
                await api.auth.logout();
                window.location.href = '/auth/login';
              } catch (err) {
                console.error('Error logging out:', err);
              }
            }}
            className="w-full px-4 py-2 bg-coral/10 text-coralText rounded-lg font-medium hover:bg-coral/20 transition-colors flex items-center justify-center gap-2 border border-coral/20"
          >
            <LogOut className="w-4 h-4" />
            {t('settings.signOutThisDevice') || 'Sign Out of This Device'}
          </button>

          <p className="text-xs text-textSecondaryLight text-center">
            {t('settings.multiSessionNote') ||
              'Advanced session management is not yet available. Currently, signing out will only affect this device.'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
