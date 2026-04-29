import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, Heart, MapPin, Shield, ArrowRight, Compass, ExternalLink, UserCog, X, Sparkles, Key } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/ui/Toast';

type LoginMethod = 'loginCode' | 'emailPin';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('loginCode');
  const [email, setEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    return handlePinLogin(e);
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginMethod === 'loginCode' && (!loginCode || !pin)) {
      setError('Please enter your login code and PIN');
      return;
    }
    if (loginMethod === 'emailPin' && (!email || !pin)) {
      setError('Please enter your email and PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const opts = loginMethod === 'loginCode'
        ? { loginCode: loginCode.trim() }
        : { email: email.trim() };
      const { data, error, friendlyError } = await api.auth.loginWithPin(pin, opts);

      if (error) {
        setError(friendlyError || error);
        showToast(friendlyError || error, 'error');
        setLoading(false);
        return;
      }

      if (data?.user) {
        window.location.href = '/home';
      } else {
        setError('Login failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('PIN login error:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminUsername || !adminPassword) {
      setAdminError('Please fill in all fields');
      return;
    }

    setAdminLoading(true);
    setAdminError(null);

    try {
      const { data, error, friendlyError } = await api.admin.login(adminUsername, adminPassword);

      if (error) {
        setAdminError(friendlyError || error);
        showToast(friendlyError || error, 'error');
        setAdminLoading(false);
        return;
      }

      if (data?.success) {
        window.location.href = '/admin';
      } else {
        setAdminError('Admin login failed. Please try again.');
        setAdminLoading(false);
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setAdminError('An unexpected error occurred. Please try again.');
      setAdminLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-cream" role="main" aria-label="Sign In">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-deepSage/5 via-teal/5 to-cosmic/10 py-16 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-deepSage leading-tight">
              Your space. Your vibe. Your people.
            </h1>
            <p className="text-xl md:text-2xl text-textSecondaryLight max-w-3xl mx-auto">
              Find free programs, connect with your community, and get support when you need it. Built for you (ages 13-25).
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <motion.button
              onClick={() => navigate('/explore')}
              className="cosmic-button w-full sm:w-auto flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Compass className="w-5 h-5" />
              <span>Explore Programs</span>
            </motion.button>
            <motion.a
              href="#signin"
              className="w-full sm:w-auto px-6 py-3 border-2 border-deepSage text-deepSage font-medium rounded-full hover:bg-deepSage hover:text-cream transition-all flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Sign In</span>
              <ArrowRight className="w-5 h-5" />
            </motion.a>
          </div>

          {/* Support Button */}
          <motion.a
            href="https://www.zeffy.com/en-CA/donation-form/build-the-room-xi-youth-hub-in-edmonton"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-coralText font-medium hover:text-coral/80 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Heart className="w-4 h-4" />
            <span>Support Our Mission</span>
          </motion.a>

        </motion.div>
      </div>

      {/* What You Can Do */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-display font-bold text-deepSage text-center">What's here for you</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-teal" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Find Programs</h3>
              <p className="text-textSecondaryLight">
                Discover free activities, workshops, and hangouts near you
              </p>
            </div>
            
            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-cosmic/10 rounded-full flex items-center justify-center">
                <Compass className="w-6 h-6 text-cosmic" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Track Your Journey</h3>
              <p className="text-textSecondaryLight">
                Check in with how you're feeling and see your growth over time
              </p>
            </div>

            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-coralText" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Get Help</h3>
              <p className="text-textSecondaryLight">
                24/7 access to support resources when things get tough
              </p>
            </div>
          </div>
        </motion.div>

        {/* Your Privacy Matters */}
        <motion.div
          className="cosmic-card p-8 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-teal" />
            <h2 className="text-2xl font-display font-bold text-deepSage">Your privacy matters</h2>
          </div>
          <p className="text-textSecondaryLight">
            We only collect what's needed to keep you safe at programs. You control what gets shared, and you can delete your data anytime.
          </p>
        </motion.div>
      </div>

      {/* Sign In Section */}
      <div id="signin" className="bg-gradient-to-br from-deepSage/5 via-teal/5 to-cosmic/10 py-16 px-6">
        <motion.div
          className="max-w-md mx-auto space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-8 h-8 text-teal" />
            </div>
            <h2 className="text-3xl font-display font-bold text-deepSage">Welcome Back</h2>
            <p className="text-xs font-medium uppercase tracking-wider text-teal">Your youth platform</p>
            <p className="text-textSecondaryLight">Sign in to continue your journey</p>
          </div>

          {error && (
            <motion.div
              className="cosmic-card p-4 bg-coral/10 border-coral/20 flex items-center space-x-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              role="alert"
              aria-live="assertive"
              id="login-error"
            >
              <AlertCircle className="w-5 h-5 text-coralText flex-shrink-0" aria-hidden="true" />
              <p className="text-sm text-coralText">{error}</p>
            </motion.div>
          )}

          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => { setLoginMethod('loginCode'); setError(null); }}
              className={`flex-1 py-2.5 rounded-md font-medium text-sm transition flex items-center justify-center gap-1.5 ${
                loginMethod === 'loginCode'
                  ? 'bg-white text-deepSage shadow-sm'
                  : 'text-textSecondaryLight hover:text-deepSage'
              }`}
            >
              <Key className="w-4 h-4" />
              Login Code
            </button>
            <button
              onClick={() => { setLoginMethod('emailPin'); setError(null); }}
              className={`flex-1 py-2.5 rounded-md font-medium text-sm transition flex items-center justify-center gap-1.5 ${
                loginMethod === 'emailPin'
                  ? 'bg-white text-deepSage shadow-sm'
                  : 'text-textSecondaryLight hover:text-deepSage'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email + PIN
            </button>
          </div>

          <form onSubmit={handleSubmit} className="cosmic-card p-6 space-y-6" aria-describedby={error ? 'login-error' : undefined}>
            {loginMethod === 'loginCode' ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="loginCode" className="block text-sm font-medium text-deepSage">
                    Login Code
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
                    <input
                      id="loginCode"
                      type="text"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                      placeholder="e.g. STAR-MOON-42"
                      className="cosmic-input pl-10 font-mono uppercase"
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="pin" className="block text-sm font-medium text-deepSage">
                    PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
                    <input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPin(val);
                      }}
                      placeholder="Your PIN"
                      className="cosmic-input pl-10 text-center text-xl tracking-[0.3em] font-mono"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </>
            ) : loginMethod === 'emailPin' ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="emailPin" className="block text-sm font-medium text-deepSage">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
                    <input
                      id="emailPin"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="cosmic-input pl-10"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="emailPinInput" className="block text-sm font-medium text-deepSage">
                    PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
                    <input
                      id="emailPinInput"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPin(val);
                      }}
                      placeholder="Your PIN"
                      className="cosmic-input pl-10 text-center text-xl tracking-[0.3em] font-mono"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </>
            ) : null}

            <motion.button
              type="submit"
              disabled={loading || (
                loginMethod === 'loginCode'
                  ? (!loginCode || pin.length < 4 || pin.length > 6)
                  : (!email || pin.length < 4 || pin.length > 6)
              )}
              className={`w-full cosmic-button ${
                loading || (
                  loginMethod === 'loginCode'
                    ? (!loginCode || pin.length < 4 || pin.length > 6)
                    : (!email || pin.length < 4 || pin.length > 6)
                ) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-deepSage border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center space-y-4">
            <p className="text-textSecondaryLight">
              Don't have an account?{' '}
              <Link
                to="/auth/signup"
                className="font-medium text-teal hover:text-teal/80 transition-colors"
              >
                Sign up
              </Link>
            </p>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-borderMutedLight"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-br from-deepSage/5 via-teal/5 to-cosmic/10 text-textSecondaryLight">
                  or
                </span>
              </div>
            </div>
            <Link
              to="/explore"
              className="block text-center text-teal hover:text-teal/80 transition-colors font-medium"
            >
              Continue as guest to explore programs
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-textSecondaryLight space-y-2">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
            <Link
              to="/about"
              className="inline-flex items-center gap-1 text-teal hover:text-teal/80 transition-colors font-medium"
            >
              <span>Learn more about Room 11</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            
            {/* Admin Login Button */}
            <div className="pt-4">
              <button
                onClick={() => setShowAdminModal(true)}
                className="text-xs text-textSecondaryLight hover:text-deepSage transition-colors inline-flex items-center gap-1"
              >
                <UserCog className="w-3 h-3" />
                <span>Admin Login</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="admin-login-modal-title">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminModal(false)}
              className="absolute inset-0 bg-deepSage/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative cosmic-card p-6 w-full max-w-md space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-cosmic/10 rounded-full flex items-center justify-center">
                    <UserCog className="w-5 h-5 text-cosmic" />
                  </div>
                  <h2 id="admin-login-modal-title" className="text-xl font-display font-bold text-deepSage">Admin Login</h2>
                </div>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="text-textSecondaryLight hover:text-deepSage transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close admin login"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Message */}
              {adminError && (
                <motion.div
                  className="cosmic-card p-4 bg-coral/10 border-coral/20 flex items-center space-x-3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <AlertCircle className="w-5 h-5 text-coralText flex-shrink-0" />
                  <p className="text-sm text-coralText">{adminError}</p>
                </motion.div>
              )}

              {/* Admin Login Form */}
              <form onSubmit={handleAdminLogin} className="space-y-4">
                {/* Username Field */}
                <div className="space-y-2">
                  <label htmlFor="admin-username" className="block text-sm font-medium text-deepSage">
                    Username
                  </label>
                  <div className="relative">
                    <UserCog className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
                    <input
                      id="admin-username"
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Enter admin username"
                      className="cosmic-input pl-10"
                      disabled={adminLoading}
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="admin-password" className="block text-sm font-medium text-deepSage">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
                    <input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="cosmic-input pl-10"
                      disabled={adminLoading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={adminLoading || !adminUsername || !adminPassword}
                  className={`w-full cosmic-button ${
                    adminLoading || !adminUsername || !adminPassword ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  whileHover={!adminLoading && adminUsername && adminPassword ? { scale: 1.02 } : {}}
                  whileTap={!adminLoading && adminUsername && adminPassword ? { scale: 0.98 } : {}}
                >
                  {adminLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-deepSage border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign In as Admin'
                  )}
                </motion.button>
              </form>

              {/* Warning */}
              <p className="text-xs text-textSecondaryLight text-center">
                Admin access is restricted to authorized personnel only
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Banner with Logo */}
      <div className="bg-gradient-to-r from-deepSage/5 via-teal/5 to-cosmic/5 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img
              src="/roomxi-logo.png"
              alt="Room XI Connect"
              className="h-24 md:h-32 w-auto object-contain"
            />
          </motion.div>
          <p className="text-textSecondaryLight text-sm">
            Empowering Edmonton youth ages 13-25
          </p>
        </div>
      </div>
    </main>
  );
}
