import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../ui/Header';
import Tab from './Tab';
import { Home, Compass, QrCode, User } from 'lucide-react';
import { useQueue } from '@/lib/queue';
import { useSession } from '@/lib/session';

export default function App() {
  const { itemCount } = useQueue();
  const { user, loading } = useSession();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-cream">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-textSecondaryLight">Loading...</p>
        </div>
      </div>
    );
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/auth', '/explore', '/program'];
  const currentPath = window.location.pathname;
  const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));

  // Redirect to explore page if not authenticated and trying to access protected routes
  if (!user && !isPublicRoute) {
    window.location.href = '/explore';
    return null;
  }

  // Don't show navigation for auth routes
  const isAuthRoute = currentPath.startsWith('/auth');

  return (
    <div className="min-h-dvh flex flex-col bg-cream text-textPrimaryLight">
      {!isAuthRoute && <Header />}
      
      <main 
        id="main" 
        className={`flex-1 px-4 max-w-xl mx-auto w-full ${
          isAuthRoute ? 'py-8' : 'pb-24'
        }`}
      >
        <Outlet />
      </main>
      
      {!isAuthRoute && (
        <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-borderMutedLight/60 safe-area-bottom">
          {user ? (
            <div className="max-w-xl mx-auto grid grid-cols-4">
              <Tab to="/home" icon={<Home />} label="Home" />
              <Tab to="/explore" icon={<Compass />} label="Explore" />
              <Tab to="/qr" icon={<QrCode />} label="QR" />
              <Tab to="/me" icon={<User />} label="Me" showDot={itemCount > 0} />
            </div>
          ) : (
            <div className="max-w-xl mx-auto grid grid-cols-2">
              <Tab to="/explore" icon={<Compass />} label="Explore" />
              <Tab to="/auth/login" icon={<User />} label="Sign In" />
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
