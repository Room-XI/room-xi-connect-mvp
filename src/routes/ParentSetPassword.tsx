import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Loader, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';

export default function ParentSetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken(token);
    }
  }, [token]);

  const validateToken = async (token: string) => {
    setValidating(true);
    try {
      const { data, error: apiError } = await api.parentAuth.validateSetupToken(token);

      if (apiError) {
        setTokenError(apiError);
        setTokenValid(false);
      } else if (data?.valid) {
        setTokenValid(true);
        setEmail(data.email);
        setName(data.name || '');
      }
    } catch (err: any) {
      setTokenError(err.message || 'Invalid or expired token');
      setTokenValid(false);
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }
    
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('Password must contain at least one special character');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data, error: apiError } = await api.parentAuth.setPassword(token!, password, name || undefined);

      if (apiError) {
        throw new Error(apiError);
      }

      if (data?.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/parent');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-teal" />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cosmic-card p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-coral" />
          </div>
          <h1 className="text-2xl font-display font-bold text-deepSage mb-2">
            Link Expired or Invalid
          </h1>
          <p className="text-textSecondaryLight mb-6">
            {tokenError || 'This password setup link has expired or is invalid.'}
          </p>
          <div className="space-y-3">
            <Link
              to="/parent/login"
              className="block w-full py-3 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors text-center"
            >
              Go to Parent Login
            </Link>
            <p className="text-sm text-textSecondaryLight">
              Need a new link? Use the "Forgot Password" option on the login page.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cosmic-card p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-teal" />
          </div>
          <h1 className="text-2xl font-display font-bold text-deepSage mb-2">
            Password Set Successfully!
          </h1>
          <p className="text-textSecondaryLight mb-4">
            Redirecting you to the parent portal...
          </p>
          <Loader className="w-6 h-6 animate-spin text-teal mx-auto" />
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
            Set Up Your Password
          </h1>
          <p className="text-textSecondaryLight mt-2">
            Create a secure password to access your parent portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-coral/10 border border-coral/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
              <p className="text-sm text-coral">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-deepSage mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-deepSage mb-1">
              Your Name (Optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
              placeholder="Your name"
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
                minLength={12}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent pr-12"
                placeholder="12+ chars with uppercase, lowercase, number & special"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-deepSage mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              'Set Password & Continue'
            )}
          </button>
        </form>

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
