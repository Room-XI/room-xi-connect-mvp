import React from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream p-6">
      <motion.div
        className="max-w-md w-full text-center space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* 404 Illustration */}
        <div className="space-y-4">
          <motion.div
            className="w-32 h-32 mx-auto bg-cosmic-gradient rounded-full flex items-center justify-center"
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
            <span className="text-4xl font-display font-bold text-deepSage">
              404
            </span>
          </motion.div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-deepSage">
              Page Not Found
            </h1>
            <p className="text-textSecondaryLight">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </div>

        {/* Floating particles */}
        <div className="relative">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-teal/30 rounded-full"
              style={{
                top: `${20 + (i * 15)}%`,
                left: `${10 + (i * 20)}%`,
              }}
              animate={{
                y: [-10, 10, -10],
                x: [-5, 5, -5],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + (i * 0.5),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link
            to="/"
            className="w-full cosmic-button flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
          
          <button
            onClick={() => navigate(-1)}
            className="w-full ghost-button flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          
          <Link
            to="/explore"
            className="w-full ghost-button flex items-center justify-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Explore Programs</span>
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="cosmic-card p-4 space-y-3">
          <h3 className="font-semibold text-deepSage">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link
              to="/home"
              className="p-2 rounded-lg hover:bg-sage/10 transition-colors text-textSecondaryLight hover:text-deepSage"
            >
              Mood Check-in
            </Link>
            <Link
              to="/explore"
              className="p-2 rounded-lg hover:bg-sage/10 transition-colors text-textSecondaryLight hover:text-deepSage"
            >
              Programs
            </Link>
            <Link
              to="/qr"
              className="p-2 rounded-lg hover:bg-sage/10 transition-colors text-textSecondaryLight hover:text-deepSage"
            >
              QR Scanner
            </Link>
            <Link
              to="/me"
              className="p-2 rounded-lg hover:bg-sage/10 transition-colors text-textSecondaryLight hover:text-deepSage"
            >
              Your Journey
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
