import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Download, 
  Trash2,
  LogOut,
  ChevronRight,
  Smartphone,
  Sparkles,
  MapPin
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useSession } from '@/lib/session';
import { clearQueue } from '@/lib/queue';
import NotificationSettings from '@/components/NotificationSettings';
import GuardianConsentStatus from '@/components/GuardianConsentStatus';
import ConsentWalletStatus from '@/components/ConsentWalletStatus';
import YouthPrivacySettings from '@/components/YouthPrivacySettings';
import AddGuardianForm from '@/components/AddGuardianForm';
import ProfileProgress from '@/components/ProfileProgress';
import AccountSecurity from '@/components/AccountSecurity';

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [ximiConsent, setXimiConsent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [wardName, setWardName] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data } = await api.profile.get();
      setXimiConsent(data?.ximiConsent || false);
      setCommunityName(data?.communityName || null);
      setWardName(data?.wardName || null);
    } catch (error) {
      console.error('Unexpected error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      await clearQueue(); // Clear offline queue on sign out
      navigate('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      // Delete account via API
      const { error } = await api.auth.deleteAccount('DELETE_MY_ACCOUNT');
      
      if (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. Please try again.');
        return;
      }

      // Clear local data
      await clearQueue();
      
      // Sign out
      await signOut();
      navigate('/auth/login');
    } catch (error) {
      console.error('Unexpected error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    }
  };

  const installApp = async () => {
    // @ts-ignore - beforeinstallprompt is not in TypeScript types
    if (window.deferredPrompt) {
      // @ts-ignore
      window.deferredPrompt.prompt();
      // @ts-ignore
      await window.deferredPrompt.userChoice;
      // @ts-ignore
      window.deferredPrompt = null;
    }
  };

  const handleToggleXimiConsent = async () => {
    const newValue = !ximiConsent;
    
    try {
      const { error } = await api.ximi.setConsent(newValue);
      
      if (error) {
        console.error('Error updating Ximi consent:', error);
        alert('Failed to update Ximi settings. Please try again.');
        return;
      }

      setXimiConsent(newValue);
    } catch (error) {
      console.error('Unexpected error updating Ximi consent:', error);
      alert('Failed to update Ximi settings. Please try again.');
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    setExportError(null);
    
    try {
      const response = await fetch('/api/consent/export-data', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setExportError('Please sign in to export your data.');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        setExportError(errorData.error || 'Failed to export data. Please try again.');
        return;
      }
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `room-xi-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      setExportError('Failed to export data. Please check your connection and try again.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-sage/20 rounded animate-pulse" />
          <div className="h-8 bg-sage/20 rounded w-32 animate-pulse" />
        </div>
        
        {[...Array(5)].map((_, i) => (
          <div key={i} className="cosmic-card p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-sage/10 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 bg-sage/10 rounded w-24" />
                  <div className="h-3 bg-sage/10 rounded w-32" />
                </div>
              </div>
              <div className="w-4 h-4 bg-sage/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center space-x-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link
          to="/me"
          className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-textSecondaryLight" />
        </Link>
        <h1 className="text-2xl font-display font-bold text-deepSage">
          {t('settings.title')}
        </h1>
      </motion.div>

      {/* Profile Section */}
      <motion.div
        className="cosmic-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-cosmic-gradient rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-deepSage" />
          </div>
          
          <div className="space-y-1">
            <h3 className="font-semibold text-deepSage">
              {user?.email || 'User'}
            </h3>
            <p className="text-sm text-textSecondaryLight">
              {t('settings.memberSince', { date: new Date(user?.createdAt || Date.now()).toLocaleDateString('en-CA', {
                month: 'long',
                year: 'numeric'
              }) })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Profile Completion Progress */}
      <ProfileProgress />

      {/* Your Community Section */}
      {(wardName || communityName) && (
        <motion.div
          className="cosmic-card p-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-teal" />
            </div>
            <h3 className="font-semibold text-deepSage">{t('settings.yourCommunity')}</h3>
          </div>
          
          <div className="pl-13 space-y-2">
            {communityName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-textSecondaryLight">{t('settings.neighbourhood')}</span>
                <span className="text-sm font-medium text-deepSage">{communityName}</span>
              </div>
            )}
            {wardName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-textSecondaryLight">{t('settings.ward')}</span>
                <span className="text-sm font-medium text-deepSage">{wardName}</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-textSecondaryLight mt-2">
            {t('settings.communityInfo')}
          </p>
        </motion.div>
      )}

      {/* Guardian Consent Status */}
      <div className="space-y-4">
        <GuardianConsentStatus />
        <ConsentWalletStatus />
        <AddGuardianForm />
      </div>

      {/* Youth Privacy Settings - Control what parents can see */}
      <motion.div
        className="cosmic-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.6 }}
      >
        <h3 className="font-semibold text-deepSage flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          {t('settings.parentVisibility')}
        </h3>
        <p className="text-sm text-textSecondaryLight">
          {t('settings.parentVisibilityDesc')}
        </p>
        <YouthPrivacySettings />
      </motion.div>

      {/* Account Security Section */}
      <AccountSecurity />

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* App Settings */}
        <motion.div
          className="cosmic-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h3 className="font-semibold text-deepSage">{t('settings.appSettings')}</h3>
          
          <div className="space-y-3">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-deepSage">{t('settings.notifications')}</p>
                  <p className="text-sm text-textSecondaryLight">
                    {t('settings.moodReminders')}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                  notifications ? 'bg-teal' : 'bg-sage/20'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Ximi AI Program Finder */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-deepSage">{t('settings.ximiProgramFinder')}</p>
                  <p className="text-sm text-textSecondaryLight">
                    {t('settings.ximiDescription')}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleToggleXimiConsent}
                className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                  ximiConsent ? 'bg-teal' : 'bg-sage/20'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    ximiConsent ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Install App */}
            <button
              onClick={installApp}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sage/5 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-teal" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-deepSage">{t('settings.installApp')}</p>
                  <p className="text-sm text-textSecondaryLight">
                    {t('settings.addToHomeScreen')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
            </button>
          </div>
        </motion.div>

        {/* Push Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <NotificationSettings />
        </motion.div>

        {/* Privacy & Security */}
        <motion.div
          className="cosmic-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h3 className="font-semibold text-deepSage">{t('settings.privacySecurity')}</h3>
          
          <div className="space-y-3">
            <Link to="/privacy-summary" className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sage/5 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-teal" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-deepSage">Your Privacy at a Glance</p>
                  <p className="text-sm text-textSecondaryLight">
                    See what data we collect and why
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
            </Link>

            <Link to="/privacy-policy" className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sage/5 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-sage/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-sage" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-deepSage">{t('settings.privacyPolicy')}</p>
                  <p className="text-sm text-textSecondaryLight">
                    {t('settings.privacyPolicyDesc')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
            </Link>

            <button 
              onClick={handleExportData}
              disabled={exportLoading}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sage/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-coral/10 rounded-lg flex items-center justify-center">
                  {exportLoading ? (
                    <div className="w-5 h-5 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-coralText" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-deepSage">
                    {exportLoading ? t('settings.exporting') : t('settings.exportData')}
                  </p>
                  <p className="text-sm text-textSecondaryLight">
                    {exportLoading ? t('settings.preparingYourData') : t('settings.exportDataDesc')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
            </button>
            
            {exportError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-coral/10 border border-coral/20 rounded-lg"
              >
                <p className="text-sm text-coralText">{exportError}</p>
                <button 
                  onClick={() => setExportError(null)}
                  className="text-xs text-coral/70 hover:text-coral mt-1 underline"
                >
                  {t('common.close')}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          className="cosmic-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h3 className="font-semibold text-deepSage">{t('settings.account')}</h3>
          
          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sage/5 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-gold" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-deepSage">{t('nav.signOut')}</p>
                  <p className="text-sm text-textSecondaryLight">
                    {t('common.signOut')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
            </button>

            <button
              onClick={handleDeleteAccount}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                showDeleteConfirm 
                  ? 'bg-coral/10 border border-coral/20' 
                  : 'hover:bg-coral/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-coral/10 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-coralText" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-coralText">
                    {showDeleteConfirm ? t('settings.deleteAccountConfirm') : t('settings.deleteAccount')}
                  </p>
                  <p className="text-sm text-textSecondaryLight">
                    {showDeleteConfirm 
                      ? t('settings.deleteAccountWarning') 
                      : t('settings.deleteAccountDesc')
                    }
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-coralText" />
            </button>

            {showDeleteConfirm && (
              <motion.button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full p-3 text-sm text-textSecondaryLight hover:text-deepSage transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {t('common.cancel')}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* App Info */}
      <motion.div
        className="text-center text-sm text-textSecondaryLight space-y-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <p>{t('settings.version', { version: '1.0.0' })}</p>
        <p>{t('settings.madeWith')}</p>
      </motion.div>
    </div>
  );
}
