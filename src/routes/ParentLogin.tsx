import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader, AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';

export default function ParentLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: apiError } = await api.parentAuth.login(email, password);

      if (apiError) {
        throw new Error(apiError);
      }

      if (data?.success) {
        navigate('/parent');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Login failed';
      if (errorMsg.includes('PASSWORD_NOT_SET')) {
        setError('Please set your password first using the link sent to your email.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotPasswordLoading(true);

    try {
      const { data, error: apiError } = await api.parentAuth.forgotPassword(forgotPasswordEmail);

      if (apiError) {
        throw new Error(apiError);
      }

      if (data?.success) {
        setForgotPasswordSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cosmic-card p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-teal" />
            </div>
            <h1 className="text-2xl font-display font-bold text-deepSage">
              Reset Password
            </h1>
            <p className="text-textSecondaryLight mt-2">
              Enter your email and we'll send you a password reset link.
            </p>
          </div>

          {forgotPasswordSuccess ? (
            <div className="text-center space-y-4">
              <div className="bg-teal/10 border border-teal/30 rounded-lg p-4">
                <p className="text-deepSage">
                  If an account exists with this email, you will receive a password reset link shortly.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordSuccess(false);
                  setForgotPasswordEmail('');
                }}
                className="text-teal hover:underline"
              >
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <div className="bg-coral/10 border border-coral/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-coral">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-deepSage mb-1">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
                  placeholder="guardian@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={forgotPasswordLoading}
                className="w-full py-3 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {forgotPasswordLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(null);
                }}
                className="w-full text-center text-textSecondaryLight hover:text-deepSage transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="cosmic-card p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-teal" />
          </div>
          <h1 className="text-2xl font-display font-bold text-deepSage">
            Parent Portal Login
          </h1>
          <p className="text-textSecondaryLight mt-2">
            Access your guardian dashboard to view your youth's wellness summary.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-coral/10 border border-coral/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
              <p className="text-sm text-coral">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-deepSage mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
              placeholder="guardian@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-deepSage mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="w-full text-center text-textSecondaryLight hover:text-teal transition-colors text-sm"
          >
            Forgot your password?
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-textSecondaryLight">
            Youth looking to sign in?{' '}
            <Link to="/auth/login" className="text-teal hover:underline">
              Youth Login
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-textSecondaryLight hover:text-deepSage flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
