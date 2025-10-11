import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Download, 
  Trash2,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Smartphone
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/session';
import { clearQueue } from '@/lib/queue';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      setProfile(data);
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
      // Call the user deletion edge function
      const { error } = await supabase.functions.invoke('user-delete');
      
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
      const { outcome } = await window.deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // @ts-ignore
      window.deferredPrompt = null;
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-sage/10 rounded animate-pulse" />
          <div className="h-8 bg-sage/10 rounded w-32 animate-pulse" />
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
          Settings
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
              Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-CA', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* App Settings */}
        <motion.div
          className="cosmic-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h3 className="font-semibold text-deepSage">App Settings</h3>
          
          <div className="space-y-3">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-deepSage">Notifications</p>
                  <p className="text-sm text-textSecondaryLight">
                    Mood reminders and updates
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

            {/* Dark Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-navy/10 rounded-lg flex items-center justify-center">
                  {darkMode ? (
                    <Moon className="w-5 h-5 text-navy" />
                  ) : (
                    <Sun className="w-5 h-5 text-navy" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-deepSage">Dark Mode</p>
                  <p className="text-sm text-textSecondaryLight">
                    Coming soon
                  </p>
                </div>
              </div>
              
              <button
                disabled
                className="w-12 h-6 rounded-full bg-sage/20 opacity-50 cursor-not-allowed"
              >
                <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-0.5" />
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
                  <p className="font-medium text-deepSage">Install App</p>
                  <p className="text-sm text-textSecondaryLight">
                    Add to home screen
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
            </button>
          </div>
        </motion.div>

        {/* Privacy & Security */}
        <motion.div
          className="cosmic-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h3 className="font-semibold text-deepSage">Privacy & Security</h3>
          
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sage/5 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-sage/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-sage" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-deepSage">Privacy Policy</p>
                  <p className="text-sm text-textSecondaryLight">
                    How we protect your data
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
            </button>

            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-sage/5 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-coral/10 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-coral" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-deepSage">Export Data</p>
                  <p className="text-sm text-textSecondaryLight">
                    Download your information
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
            </button>
          </div>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          className="cosmic-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h3 className="font-semibold text-deepSage">Account</h3>
          
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
                  <p className="font-medium text-deepSage">Sign Out</p>
                  <p className="text-sm text-textSecondaryLight">
                    Sign out of your account
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
                  <Trash2 className="w-5 h-5 text-coral" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-coral">
                    {showDeleteConfirm ? 'Confirm Delete Account' : 'Delete Account'}
                  </p>
                  <p className="text-sm text-textSecondaryLight">
                    {showDeleteConfirm 
                      ? 'This action cannot be undone' 
                      : 'Permanently remove your account'
                    }
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-coral" />
            </button>

            {showDeleteConfirm && (
              <motion.button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full p-3 text-sm text-textSecondaryLight hover:text-deepSage transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Cancel
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
        <p>Room XI Connect v1.0.0</p>
        <p>Made with 💚 for youth mental health</p>
      </motion.div>
    </div>
  );
}
