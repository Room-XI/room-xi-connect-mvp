import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Reset() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (error) {
      console.error('Password reset error:', error);
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
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your email and follow the instructions to reset your password.
            </p>
          </div>

          <div className="cosmic-card p-4 bg-teal/10 border-teal/20">
            <p className="text-sm text-teal">
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/auth/login"
              className="w-full cosmic-button block text-center"
            >
              Back to Sign In
            </Link>
            
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="w-full ghost-button"
            >
              Send Another Email
            </button>
          </div>
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
              Reset Password
            </h1>
            <p className="text-textSecondaryLight">
              Enter your email to receive a password reset link
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

        {/* Reset Form */}
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
              Email Address
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
            <p className="text-xs text-textSecondaryLight">
              We'll send you a link to reset your password
            </p>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !email}
            className={`w-full cosmic-button ${
              loading || !email ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            whileHover={!loading && email ? { scale: 1.02 } : {}}
            whileTap={!loading && email ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-deepSage border-t-transparent rounded-full animate-spin" />
                <span>Sending reset link...</span>
              </div>
            ) : (
              'Send Reset Link'
            )}
          </motion.button>
        </motion.form>

        {/* Back to Login */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Link
            to="/auth/login"
            className="inline-flex items-center space-x-2 text-sm font-medium text-teal hover:text-teal/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
        </motion.div>

        {/* Help Text */}
        <motion.div
          className="cosmic-card p-4 bg-sage/10 border-sage/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <p className="text-sm text-sage text-center">
            Remember your password?{' '}
            <Link
              to="/auth/login"
              className="font-medium hover:underline"
            >
              Sign in instead
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
