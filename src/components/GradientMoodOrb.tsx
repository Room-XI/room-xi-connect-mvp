import { motion } from 'framer-motion';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Info } from 'lucide-react';
import { useMoodGradient } from '@/hooks/useMoodGradient';
import { useMoodOrbSettings } from '@/hooks/useMoodOrbSettings';
import ColorLegendDrawer from './ColorLegendDrawer';
import type { MoodBlend } from '@/lib/moodGradient';
import {
  saveOrbTweenState,
  loadOrbTweenState,
  calculateTweenProgress,
  isTweenStateValid,
} from '@/lib/orbPersistence';

interface GradientMoodOrbProps {
  size?: number;
  onClick?: () => void;
  className?: string;
  streak?: number; // 0-7 day streak for halo ring
  showSlowSettle?: boolean; // Enable 10-minute gradual transition
  overrideBlend?: MoodBlend | null; // For historical/timelapse views
}

/**
 * 7-Day Gradient Mood Orb
 * Displays a blended orb with all mood colors from the past week
 * Features:
 * - Weighted color gradient based on mood frequency
 * - Breathing animation (8-second cycle)
 * - Streak halo ring (grows from 0-7 days)
 * - Optional slow-settle animation (10-minute transition)
 * - Export support via canvas ref
 */
const GradientMoodOrb = forwardRef<HTMLDivElement, GradientMoodOrbProps>(({ 
  size = 200, 
  onClick, 
  className = '',
  streak: overrideStreak,
  showSlowSettle = true,
  overrideBlend,
}, ref) => {
  const { moodBlend: liveMoodBlend, summary, loading } = useMoodGradient();
  const { settings } = useMoodOrbSettings();
  
  // Use override blend (for historical data) or live blend
  const moodBlend = overrideBlend || liveMoodBlend;
  
  // Internal ref for export functionality
  const orbRef = useRef<HTMLDivElement>(null);
  
  // Expose DOM element to parent for export
  useImperativeHandle(ref, () => orbRef.current as HTMLDivElement);
  
  // Use streak from API summary if available, otherwise use prop override
  const streak = summary?.streak7 ?? overrideStreak ?? 0;
  
  // Default cosmic gradient while loading
  const defaultStyle = {
    gradient: 'radial-gradient(circle at 30% 30%, #2EC489, #6E8F7A, #D8AE3D)',
    glow: 'rgba(46, 196, 137, 0.4)',
    particles: '#2EC489',
  };
  
  // Check for fallback states
  const hasNoData = summary && summary.daysWithData === 0;
  const mutedGrayStyle = {
    gradient: 'radial-gradient(circle at 30% 30%, #6B7280, #4B5563, #374151)',
    glow: 'rgba(107, 114, 128, 0.3)',
    particles: '#9CA3AF',
  };
  
  const style = hasNoData ? mutedGrayStyle : (moodBlend || defaultStyle);
  
  // Track if this is the first render (for localStorage resume)
  const isFirstRender = useRef(true);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [showColorLegend, setShowColorLegend] = useState(false);
  
  // On mount, check if we have a saved state that matches current state
  useEffect(() => {
    if (isFirstRender.current && moodBlend) {
      const savedState = loadOrbTweenState();
      
      // If saved state exists, is valid, and matches current blend, skip animation
      if (savedState && isTweenStateValid(savedState)) {
        const progress = calculateTweenProgress(savedState.tweenStartAt, savedState.settleMs);
        
        // If animation is complete or near complete, don't animate
        if (progress >= 0.95 && savedState.orbTarget.gradient === moodBlend.gradient) {
          setShouldAnimate(false);
        }
      }
      
      isFirstRender.current = false;
    }
  }, [moodBlend]);
  
  // Save tween state when mood blend changes
  useEffect(() => {
    if (moodBlend && !loading) {
      const settleMs = showSlowSettle ? 600000 : 2000; // 10 min or 2 sec
      
      saveOrbTweenState({
        orbTarget: {
          gradient: moodBlend.gradient,
          glow: moodBlend.glow,
          particles: moodBlend.particles,
        },
        tweenStartAt: Date.now(),
        settleMs,
      });
      
      // Enable animation for new data
      if (!isFirstRender.current) {
        setShouldAnimate(true);
      }
    }
  }, [moodBlend, loading, showSlowSettle]);
  
  // Calculate halo opacity based on streak (0-7 days)
  const haloOpacity = Math.min(streak / 7, 1);
  const haloGlow = streak === 7 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
  
  // Slow-settle transition duration (10 minutes = 600 seconds)
  // Skip animation if we're resuming from saved state
  const settleTransition = (showSlowSettle && shouldAnimate) ? {
    duration: 600,
    ease: "easeInOut",
  } : {
    duration: shouldAnimate ? 2 : 0,
    ease: "easeInOut",
  };
  
  return (
    <motion.div
      ref={orbRef}
      className={`relative cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Streak Halo Ring */}
      {streak > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: `${3 + (streak * 0.5)}px solid ${haloGlow}`,
            opacity: haloOpacity,
            boxShadow: `0 0 ${10 + (streak * 2)}px ${haloGlow}`,
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [haloOpacity * 0.8, haloOpacity, haloOpacity * 0.8],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      
      {/* Main orb with breathing animation and slow-settle gradient transition */}
      <motion.div
        className={`absolute inset-0 rounded-full ${
          settings.highVisibility ? 'ring-3 ring-white ring-opacity-80' : ''
        }`}
        style={{
          background: style.gradient,
          boxShadow: settings.highVisibility 
            ? `0 0 40px ${style.glow}, 0 0 60px ${style.glow}, inset 0 0 20px rgba(0, 0, 0, 0.3)`
            : `0 0 30px ${style.glow}`,
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          scale: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          },
          background: settleTransition,
        }}
      >
        {/* Highlight overlay for 3D effect */}
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle at 70% 30%, transparent 30%, rgba(255, 255, 255, 0.3) 70%)',
          }}
        />
        
        {/* Pattern overlay for color-blind accessibility */}
        {settings.patternOverlay && summary && (
          <div className="absolute inset-0 rounded-full overflow-hidden opacity-40">
            {/* Warm colors (clear, breezy, aurora) get dots */}
            {((summary.ratios.clear || 0) + (summary.ratios.breezy || 0) + (summary.ratios.aurora || 0)) > 0.3 && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
                  backgroundSize: '8px 8px',
                }}
              />
            )}
            {/* Cool colors (foggy, stormy, cold) get lines */}
            {((summary.ratios.foggy || 0) + (summary.ratios.stormy || 0) + (summary.ratios.cold || 0)) > 0.3 && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 5px)',
                }}
              />
            )}
          </div>
        )}
        
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
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* No data message */}
      {hasNoData && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-center px-6">
          <div className="text-white drop-shadow-lg">
            <div className="text-sm font-medium mb-1">Orb is resting</div>
            <div className="text-xs opacity-80">Check in to reflect</div>
          </div>
        </div>
      )}
      
      {/* Color Legend Button */}
      {settings.showColorKey && !loading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowColorLegend(true);
          }}
          className="absolute bottom-2 right-2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Show color meanings"
        >
          <Info className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      )}
      
      {/* Accessibility label */}
      <span className="sr-only">
        {streak > 0 ? `${streak}-day streak! ` : ''}
        {hasNoData ? 'No check-ins this week. ' : ''}
        Mood orb showing your week at a glance. Tap to check in.
      </span>
      
      {/* Color Legend Drawer */}
      <ColorLegendDrawer
        isOpen={showColorLegend}
        onClose={() => setShowColorLegend(false)}
      />
    </motion.div>
  );
});

GradientMoodOrb.displayName = 'GradientMoodOrb';

export default GradientMoodOrb;
