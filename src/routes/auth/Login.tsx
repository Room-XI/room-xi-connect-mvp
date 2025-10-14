import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Heart, MapPin, Shield, Users, ArrowRight, Compass } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const partners = [
    'CanManDan',
    'JumpStart',
    'Allendale Community',
    'Duggan Community',
    'YMCA of Northern Alberta',
    'OTB Basketball'
  ];

  return (
    <div className="min-h-dvh bg-cream">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-deepSage/5 via-teal/5 to-cosmic/10 py-16 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <motion.div
            className="w-24 h-24 mx-auto bg-cosmic-gradient rounded-full flex items-center justify-center"
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
            <span className="text-3xl font-display font-bold text-deepSage">11</span>
          </motion.div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-deepSage leading-tight">
              Room 11 Foundation
            </h1>
            <p className="text-xl md:text-2xl text-textSecondaryLight max-w-3xl mx-auto">
              Help youth ages 13 to 25 feel seen, build capacity, and find community through creative expression, movement, and trauma-informed supports
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
        </motion.div>
      </div>

      {/* About Section */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        {/* The Problem */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-display font-bold text-deepSage text-center">The Challenge</h2>
          <p className="text-lg text-textSecondaryLight max-w-3xl mx-auto text-center">
            Youth struggle to find trustworthy programs, track well-being, and ask for help early. 
            Staff lack simple tools to see needs and attendance without collecting invasive data. 
            Communities want privacy-respecting options that fit limited budgets.
          </p>
        </motion.div>

        {/* The Solution */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-display font-bold text-deepSage text-center">Our Solution</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-teal" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Discover Programs</h3>
              <p className="text-textSecondaryLight">
                Find safe, free local programs tailored to your interests and needs
              </p>
            </div>
            
            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-cosmic/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-cosmic" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Universal Intake</h3>
              <p className="text-textSecondaryLight">
                Streamlined onboarding that respects your time and privacy
              </p>
            </div>

            <div className="cosmic-card p-6 space-y-3">
              <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-coral" />
              </div>
              <h3 className="font-display font-bold text-deepSage">Crisis Support</h3>
              <p className="text-textSecondaryLight">
                Quick access to help when you need it most, available 24/7
              </p>
            </div>
          </div>
        </motion.div>

        {/* Privacy & Design */}
        <motion.div
          className="cosmic-card p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-teal" />
            <h3 className="text-2xl font-display font-bold text-deepSage">Privacy by Design</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-textSecondaryLight">
            <div>
              <p className="font-medium text-deepSage mb-2">Youth Dignity First</p>
              <p>Minimal data collection with non-identifying XID for attendance. Clear consent, export, and deletion options.</p>
            </div>
            <div>
              <p className="font-medium text-deepSage mb-2">Accessible Design</p>
              <p>Warm, steady interface with WCAG AA standards and 44px tap targets for easy navigation.</p>
            </div>
          </div>
        </motion.div>

        {/* Who We Serve */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-3xl font-display font-bold text-deepSage text-center">Who We Serve</h2>
          <p className="text-lg text-textSecondaryLight max-w-3xl mx-auto text-center">
            Low-income, newcomer, Indigenous, racialized, and system-impacted youth in Edmonton 
            and similar cities, plus the staff who support them.
          </p>
        </motion.div>

        {/* Impact Stats */}
        <motion.div
          className="bg-gradient-to-br from-teal/5 to-cosmic/5 rounded-3xl p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center space-y-4">
            <p className="text-5xl font-display font-bold text-deepSage">570+</p>
            <p className="text-xl text-textSecondaryLight">Youth served across local programs and pilots</p>
          </div>
        </motion.div>

        {/* Partners */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl font-display font-bold text-deepSage text-center">Our Partners</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {partners.map((partner, index) => (
              <motion.div
                key={partner}
                className="cosmic-card p-4 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <p className="text-sm font-medium text-deepSage">{partner}</p>
              </motion.div>
            ))}
          </div>
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
            <h2 className="text-3xl font-display font-bold text-deepSage">Welcome Back</h2>
            <p className="text-textSecondaryLight">Sign in to continue your journey</p>
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="cosmic-card p-6 space-y-6">
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
                  placeholder="Enter your password"
                  className="cosmic-input pl-10 pr-10"
                  disabled={loading}
                  autoComplete="current-password"
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
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                to="/auth/reset"
                className="text-sm font-medium text-teal hover:text-teal/80 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full cosmic-button ${
                loading || !email || !password ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              whileHover={!loading && email && password ? { scale: 1.02 } : {}}
              whileTap={!loading && email && password ? { scale: 0.98 } : {}}
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
          <div className="text-center text-xs text-textSecondaryLight space-y-1">
            <p>By signing in, you agree to our Terms of Service</p>
            <p>and Privacy Policy</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
