import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/session';

export default function RootRedirect() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Navigate to={user ? '/home' : '/explore'} replace />;
}
