import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  Shield
} from 'lucide-react';
import { api } from '@/lib/api';

interface ParentSession {
  parent: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  childrenCount: number;
  pendingDocuments: number;
}

export default function ParentLayout() {
  const { t } = useTranslation();
  const [session, setSession] = useState<ParentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await api.parent.getSession();
      if (res.error) {
        navigate('/parent/login');
      } else {
        setSession(res.data);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      navigate('/parent/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.parent.logout();
      navigate('/parent/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-backgroundStart to-backgroundEnd">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div>
      </div>
    );
  }

  if (!session) return null;

  const navItems: Array<{ path: string; label: string; icon: typeof Shield; badge?: number }> = [
    { path: '/parent', label: t('parent.layout.nav.consentWallet', 'Consent Wallet'), icon: Shield },
    { path: '/parent/children', label: t('parent.myChildren'), icon: Users },
    { path: '/parent/settings', label: t('parent.layout.nav.settings'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-backgroundStart to-backgroundEnd flex flex-col">
      {/* Header */}
      <header className="bg-deepSage text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/parent" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal to-deepSage rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">XI</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-white">Room XI Connect</h1>
                <p className="text-xs text-white/60">{t('parent.portal')}</p>
              </div>
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              {session.pendingDocuments > 0 && (
                <NavLink
                  to="/parent/documents"
                  className="relative p-2 text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </NavLink>
              )}

              {/* User Menu */}
              <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {session.parent.firstName} {session.parent.lastName}
                  </p>
                  <p className="text-xs text-white/60">{t('parent.roleLabel')}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                  title={t('common.signOut')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white/70 hover:bg-white/10 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-deepSage/95 border-t border-white/10"
          >
            <div className="px-4 py-3 border-b border-white/10">
              <p className="font-medium text-white">
                {session.parent.firstName} {session.parent.lastName}
              </p>
              <p className="text-sm text-white/60">{session.parent.email}</p>
            </div>
            <nav className="py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center justify-between px-4 py-3 transition-colors ${
                      isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>
                  </NavLink>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-200 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{t('common.signOut')}</span>
              </button>
            </nav>
          </motion.div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-borderMutedLight mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-textSecondaryLight">
          <p>{t('parent.layout.footerText')}</p>
        </div>
      </footer>
    </div>
  );
}
