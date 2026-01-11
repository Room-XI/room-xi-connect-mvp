import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, LogIn } from 'lucide-react';

export default function AdminPortal() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'access' | 'login'>('access');
  const [accessCode, setAccessCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/verify-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ code: accessCode })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid access code');
        return;
      }

      setCsrfToken(data.csrfToken);
      setStep('login');
      setAccessCode(''); // Clear for security
    } catch (err) {
      console.error('Access error:', err);
      setError('Access verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      // Store new CSRF token for admin session
      if (data.csrfToken) {
        localStorage.setItem('adminCsrfToken', data.csrfToken);
      }

      // Navigate to admin dashboard
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-backgroundStart to-backgroundEnd flex items-center justify-center p-4">
      <motion.div
        className="cosmic-card p-8 max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-6">
          <Shield className="w-12 h-12 text-teal mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-deepSage">Admin Portal</h1>
          <p className="text-sm text-textSecondaryLight mt-2">
            {step === 'access' ? 'Enter access code to continue' : 'Enter admin credentials'}
          </p>
        </div>

        {error && (
          <motion.div
            className="bg-coral/10 border border-coral/30 rounded-lg p-3 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-sm text-coral text-center">{error}</p>
          </motion.div>
        )}

        {step === 'access' ? (
          <form onSubmit={handleAccessCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-deepSage mb-2">
                Access Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-sage" />
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal bg-surface"
                  placeholder="Enter access code"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal text-white py-3 rounded-lg font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-deepSage mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal bg-surface"
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-deepSage mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal bg-surface"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal text-white py-3 rounded-lg font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('access')}
              className="w-full text-sage text-sm hover:text-deepSage transition-colors"
            >
              Back to Access Code
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}