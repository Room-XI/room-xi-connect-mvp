import { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Eye, EyeOff, Loader, AlertCircle, ArrowLeft, Mail, Lock, CheckCircle, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';

const parentAccent = '#e11d48';
const parentAccentLight = 'rgba(225,29,72,0.10)';
const parentAccentHover = 'rgba(225,29,72,0.85)';

type LoginView = 'magic-link' | 'password' | 'forgot-password';

export default function ParentLogin() {
  const navigate = useNavigate();
  const [view, setView] = useState<LoginView>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  // Pilot v1 (T010): magic-link is the canonical parent sign-in. The password
  // fallback endpoint exists server-side but is gated by
  // ENABLE_PARENT_PASSWORD_FALLBACK and is never surfaced in the pilot UI.
  const passwordLoginEnabled = false;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: apiError } = await api.parentAuth.requestMagicLink(email);

      if (apiError) {
        throw new Error(apiError);
      }

      if (data?.success) {
        setMagicLinkSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send sign-in link');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
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

  if (view === 'forgot-password') {
    return (
      <main className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4" role="main" aria-label="Parent Portal Reset Password">
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
                  setView('magic-link');
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
                  <AlertCircle className="w-5 h-5 text-coralText flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-coralText">{error}</p>
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
                  setView('magic-link');
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
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4" role="main" aria-label="Parent Portal Login">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="cosmic-card p-0 max-w-md w-full overflow-hidden"
      >
        <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${parentAccent}, #f43f5e)` }} />
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: parentAccentLight }}>
              <Home className="w-8 h-8" style={{ color: parentAccent }} />
            </div>
            <h1 className="text-2xl font-display font-bold text-deepSage">
              Parent Portal
            </h1>
            <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: parentAccent }}>Parent & Guardian Portal</p>
            <p className="text-textSecondaryLight mt-2">
              Access your guardian dashboard to view your youth's wellness summary.
            </p>
          </div>

          {magicLinkSent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-teal/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-teal" />
              </div>
              <h2 className="text-xl font-display font-bold text-deepSage">Check your email</h2>
              <p className="text-textSecondaryLight">
                If an account exists for <strong>{email}</strong>, we've sent a sign-in link. Click the link to access your parent dashboard.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                The link expires in 15 minutes and can only be used once.
              </div>
              <button
                onClick={() => { setMagicLinkSent(false); setEmail(''); }}
                className="text-teal hover:underline text-sm"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              {passwordLoginEnabled && (
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6">
                  <button
                    onClick={() => { setView('magic-link'); setError(null); }}
                    className={`flex-1 py-2.5 rounded-md font-medium text-sm transition flex items-center justify-center gap-1.5 ${
                      view === 'magic-link'
                        ? 'bg-white text-deepSage shadow-sm'
                        : 'text-textSecondaryLight hover:text-deepSage'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    Email Link
                  </button>
                  <button
                    onClick={() => { setView('password'); setError(null); }}
                    className={`flex-1 py-2.5 rounded-md font-medium text-sm transition flex items-center justify-center gap-1.5 ${
                      view === 'password'
                        ? 'bg-white text-deepSage shadow-sm'
                        : 'text-textSecondaryLight hover:text-deepSage'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Password
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-coral/10 border border-coral/30 rounded-lg p-3 flex items-start gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-coralText flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-coralText">{error}</p>
                </div>
              )}

              {view === 'magic-link' ? (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="bg-teal/5 border border-teal/10 rounded-lg p-3 text-sm text-textSecondaryLight">
                    Enter your email and we'll send you a sign-in link. No password needed.
                  </div>

                  <div>
                    <label htmlFor="magic-email" className="block text-sm font-medium text-deepSage mb-1">
                      Email Address
                    </label>
                    <input
                      id="magic-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': parentAccent } as any}
                      placeholder="guardian@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: parentAccent }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = parentAccentHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = parentAccent)}
                  >
                    {loading ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Sign-In Link
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': parentAccent } as any}
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent pr-12"
                        style={{ '--tw-ring-color': parentAccent } as any}
                        placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: parentAccent }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = parentAccentHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = parentAccent)}
                  >
                    {loading ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('forgot-password')}
                    className="w-full text-center text-textSecondaryLight transition-colors text-sm"
                    onMouseEnter={(e) => (e.currentTarget.style.color = parentAccent)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                  >
                    Forgot your password?
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-textSecondaryLight">
              Youth looking to sign in?{' '}
              <Link to="/auth/login" className="hover:underline" style={{ color: parentAccent }}>
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
        </div>
      </motion.div>
    </main>
  );
}
