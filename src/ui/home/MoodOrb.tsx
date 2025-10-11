import React from 'react';
import { motion } from 'framer-motion';

interface MoodOrbProps {
  size?: number;
  mood?: number; // 1-6 mood level
  onClick?: () => void;
  className?: string;
}

// Mood-specific colors and gradients for the Cosmic Garden design
const moodStyles = {
  1: { // Stormy
    gradient: 'radial-gradient(circle at 30% 30%, #64748b, #475569, #334155)',
    glow: 'rgba(100, 116, 139, 0.4)',
    particles: '#94a3b8',
  },
  2: { // Foggy
    gradient: 'radial-gradient(circle at 30% 30%, #94a3b8, #64748b, #475569)',
    glow: 'rgba(148, 163, 184, 0.4)',
    particles: '#cbd5e1',
  },
  3: { // Overcast
    gradient: 'radial-gradient(circle at 30% 30%, #cbd5e1, #94a3b8, #64748b)',
    glow: 'rgba(203, 213, 225, 0.4)',
    particles: '#e2e8f0',
  },
  4: { // Calm
    gradient: 'radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b, #d97706)',
    glow: 'rgba(251, 191, 36, 0.4)',
    particles: '#fcd34d',
  },
  5: { // Upbeat
    gradient: 'radial-gradient(circle at 30% 30%, #f59e0b, #d97706, #b45309)',
    glow: 'rgba(245, 158, 11, 0.4)',
    particles: '#fbbf24',
  },
  6: { // Aurora
    gradient: 'radial-gradient(circle at 30% 30%, #8b5cf6, #7c3aed, #6d28d9)',
    glow: 'rgba(139, 92, 246, 0.4)',
    particles: '#a78bfa',
  },
};

// Default cosmic gradient when no mood is set
const defaultStyle = {
  gradient: 'radial-gradient(circle at 30% 30%, #2EC489, #6E8F7A, #D8AE3D)',
  glow: 'rgba(46, 196, 137, 0.4)',
  particles: '#2EC489',
};

export default function MoodOrb({ 
  size = 200, 
  mood, 
  onClick, 
  className = '' 
}: MoodOrbProps) {
  const style = mood ? moodStyles[mood as keyof typeof moodStyles] : defaultStyle;
  
  return (
    <motion.div
      className={`relative cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Main orb with breathing animation */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: style.gradient,
          boxShadow: `0 0 30px ${style.glow}`,
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Highlight overlay for 3D effect */}
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle at 70% 30%, transparent 30%, rgba(255, 255, 255, 0.3) 70%)',
          }}
        />
        
        {/* Floating particles */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full opacity-60"
              style={{
                backgroundColor: style.particles,
                left: `${20 + (i * 12)}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
              animate={{
                y: [-10, 10, -10],
                x: [-5, 5, -5],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 6 + (i * 0.5),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
        
        {/* Ripple effect on hover */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 opacity-0"
          style={{ borderColor: style.particles }}
          whileHover={{
            scale: [1, 1.2, 1.4],
            opacity: [0, 0.6, 0],
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </motion.div>
      
      {/* Accessibility label */}
      <span className="sr-only">
        {mood ? `Current mood level: ${mood}` : 'Tap to check in your mood'}
      </span>
    </motion.div>
  );
}
