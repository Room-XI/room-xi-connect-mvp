import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (error) {
      console.error('Registration error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-cream p-6">
        <motion.div
          className="w-full max-w-md text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-20 h-20 mx-auto bg-teal/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-teal" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-display font-bold text-deepSage">
              Check Your Email
            </h1>
            <p className="text-textSecondaryLight">
              We've sent you a confirmation link at <strong>{email}</strong>. 
              Please check your email and click the link to activate your account.
            </p>
          </div>

          <div className="cosmic-card p-4 bg-teal/10 border-teal/20">
            <p className="text-sm text-teal">
              Don't see the email? Check your spam folder or try signing up again.
            </p>
          </div>

          <Link
            to="/auth/login"
            className="inline-block cosmic-button"
          >
            Back to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream p-6">
      <motion.div
        className="w-full max-w-md space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            className="w-20 h-20 mx-auto bg-cosmic-gradient rounded-full flex items-center justify-center"
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <span className="text-2xl font-display font-bold text-deepSage">
              XI
            </span>
          </motion.div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-deepSage">
              Join Room XI Connect
            </h1>
            <p className="text-textSecondaryLight">
              Create your account to get started
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            className="cosmic-card p-4 bg-coral/10 border-coral/20 flex items-center space-x-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <AlertCircle className="w-5 h-5 text-coral flex-shrink-0" />
            <p className="text-sm text-coral">{error}</p>
          </motion.div>
        )}

        {/* Registration Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="cosmic-card p-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-deepSage">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
              <input
                id="email"
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

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-deepSage">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="cosmic-input pl-10 pr-10"
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textSecondaryLight hover:text-deepSage transition-colors"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Password Requirements */}
            {password && (
              <div className="text-xs space-y-1">
                <div className={`flex items-center space-x-2 ${
                  password.length >= 8 ? 'text-teal' : 'text-textSecondaryLight'
                }`}>
                  <div className={`w-1 h-1 rounded-full ${
                    password.length >= 8 ? 'bg-teal' : 'bg-textSecondaryLight'
                  }`} />
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center space-x-2 ${
                  /(?=.*[a-z])(?=.*[A-Z])/.test(password) ? 'text-teal' : 'text-textSecondaryLight'
                }`}>
                  <div className={`w-1 h-1 rounded-full ${
                    /(?=.*[a-z])(?=.*[A-Z])/.test(password) ? 'bg-teal' : 'bg-textSecondaryLight'
                  }`} />
                  <span>Upper and lowercase letters</span>
                </div>
                <div className={`flex items-center space-x-2 ${
                  /(?=.*\d)/.test(password) ? 'text-teal' : 'text-textSecondaryLight'
                }`}>
                  <div className={`w-1 h-1 rounded-full ${
                    /(?=.*\d)/.test(password) ? 'bg-teal' : 'bg-textSecondaryLight'
                  }`} />
                  <span>At least one number</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-deepSage">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-textSecondaryLight" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="cosmic-input pl-10 pr-10"
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-textSecondaryLight hover:text-deepSage transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className={`text-xs flex items-center space-x-2 ${
                password === confirmPassword ? 'text-teal' : 'text-coral'
              }`}>
                <div className={`w-1 h-1 rounded-full ${
                  password === confirmPassword ? 'bg-teal' : 'bg-coral'
                }`} />
                <span>
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !email || !password || !confirmPassword || password !== confirmPassword}
            className={`w-full cosmic-button ${
              loading || !email || !password || !confirmPassword || password !== confirmPassword 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
            whileHover={!loading && email && password && confirmPassword && password === confirmPassword ? { scale: 1.02 } : {}}
            whileTap={!loading && email && password && confirmPassword && password === confirmPassword ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-deepSage border-t-transparent rounded-full animate-spin" />
                <span>Creating account...</span>
              </div>
            ) : (
              'Create Account'
            )}
          </motion.button>
        </motion.form>

        {/* Sign In Link */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <p className="text-textSecondaryLight">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-teal hover:text-teal/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="text-center text-xs text-textSecondaryLight space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <p>By creating an account, you agree to our Terms of Service</p>
          <p>and Privacy Policy</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
