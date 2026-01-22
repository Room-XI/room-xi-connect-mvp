import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Building,
  Users,
  FileText,
  AlertTriangle,
  LogOut,
  Shield,
  Menu,
  X,
  Brain
} from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';

const navItems = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/admin/organizations', label: 'Organizations', icon: Building },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  { path: '/admin/compliance', label: 'Breach/Compliance', icon: AlertTriangle },
  { path: '/admin/ai-interventions', label: 'AI Interventions', icon: Brain },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await api.admin.logout();
      navigate('/control/entrance');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-backgroundStart to-backgroundEnd flex">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface shadow-md"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-deepSage text-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-teal" />
            <div>
              <h1 className="text-lg font-bold">Admin Portal</h1>
              <p className="text-xs text-white/60">Room XI Connect</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-teal/20 text-teal border-r-2 border-teal'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8 overflow-auto lg:ml-0 mt-16 lg:mt-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
