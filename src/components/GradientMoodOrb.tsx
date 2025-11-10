import { motion } from 'framer-motion';
import { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import { Info } from 'lucide-react';
import { useMoodGradient } from '@/hooks/useMoodGradient';
import { useMoodOrbSettings } from '@/hooks/useMoodOrbSettings';
import ColorLegendDrawer from './ColorLegendDrawer';
import {
  renderSmoothGradient,
  calculateColorStops,
  drawPatternOverlay,
  getDominantMoodColor,
  type CanvasGradientOptions,
} from '@/lib/canvasGradient';
import type { MoodKey } from '@/lib/moodConfig';
import {
  saveOrbTweenState,
  loadOrbTweenState,
  calculateTweenProgress,
  isTweenStateValid,
} from '@/lib/orbPersistence';
import './MoodOrb.css';

interface GradientMoodOrbProps {
  size?: number;
  onClick?: () => void;
  className?: string;
  streak?: number; // 0-7 day streak for halo ring
  showSlowSettle?: boolean; // Enable 1-2 minute gradual transition
  overrideRatios?: Record<string, number> | null; // For historical/timelapse views
}

/**
 * 7-Day Gradient Mood Orb (Canvas-Based Smooth Blend)
 * Displays a dreamy blended orb with all 6 mood colors from the past week
 * Features:
 * - Smooth continuous gradient using canvas rendering
 * - All 6 moods always visible (epsilon weighting)
 * - Soft Gaussian blur for atmospheric quality
 * - HSL color interpolation to avoid muddy transitions
 * - Breathing animation (8-second cycle)
 * - Streak halo ring (grows from 0-7 days)
 * - Pattern overlay for accessibility
 * - Export support via DOM ref
 */
const GradientMoodOrb = forwardRef<HTMLDivElement, GradientMoodOrbProps>(({ 
  size = 200, 
  onClick, 
  className = '',
  streak: overrideStreak,
  showSlowSettle = true,
  overrideRatios,
}, ref) => {
  const { summary, loading } = useMoodGradient();
  const { settings } = useMoodOrbSettings();
  
  // Use override ratios (for historical data) or live ratios
  const ratios = overrideRatios || summary?.ratios || {};
  
  // Internal refs
  const orbRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Merged ref callback to expose DOM element to parent for export
  const mergedRef = useCallback((node: HTMLDivElement | null) => {
    (orbRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [ref]);
  
  // Use streak from API summary if available, otherwise use prop override
  const streak = summary?.streak7 ?? overrideStreak ?? 0;
  
  // Check for fallback states
  const hasNoData = summary && summary.daysWithData === 0;
  
  // Track animation state
  const isFirstRender = useRef(true);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [showColorLegend, setShowColorLegend] = useState(false);
  
  // Calculate dominant mood for glow effects
  const dominantMoodData = getDominantMoodColor(ratios as Record<MoodKey, number>);
  const glowColor = `hsla(${dominantMoodData.h}, ${dominantMoodData.s}%, ${dominantMoodData.l}%, 0.4)`;
  const particleColor = `hsl(${dominantMoodData.h}, ${dominantMoodData.s}%, ${Math.min(dominantMoodData.l + 15, 95)}%)`;
  
  // Render canvas gradient
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size (renderSmoothGradient handles DPR internally)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Handle no data state with muted gray gradient
    if (hasNoData) {
      // Set transform for logical coordinate system
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      const gradient = ctx.createRadialGradient(
        size * 0.3, size * 0.3, 0,
        size / 2, size / 2, size / 2
      );
      gradient.addColorStop(0, '#6B7280');
      gradient.addColorStop(0.5, '#4B5563');
      gradient.addColorStop(1, '#374151');
      
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
      return;
    }
    
    // Render smooth gradient with mood data
    const options: CanvasGradientOptions = {
      ratios: ratios as Record<MoodKey, number>,
      size,
      blurRadius: 90, // Ultra-soft dreamy atmospheric blur for maximum smoothness
      highContrast: settings.highVisibility,
      showPatterns: settings.patternOverlay,
    };
    
    renderSmoothGradient(ctx, options);
    
    // Add pattern overlay if enabled (drawPatternOverlay expects dpr-scaled context)
    if (settings.patternOverlay && summary) {
      const colorStops = calculateColorStops(ratios as Record<MoodKey, number>);
      drawPatternOverlay(ctx, size, colorStops);
    }
    
  }, [size, ratios, loading, hasNoData, settings.highVisibility, settings.patternOverlay, summary]);
  
  // On mount, check if we have a saved state that matches current state
  useEffect(() => {
    if (isFirstRender.current && ratios) {
      const savedState = loadOrbTweenState();
      
      if (savedState && isTweenStateValid(savedState)) {
        const progress = calculateTweenProgress(savedState.tweenStartAt, savedState.settleMs);
        
        if (progress >= 0.95) {
          setShouldAnimate(false);
        }
      }
      
      isFirstRender.current = false;
    }
  }, [ratios]);
  
  // Save tween state when ratios change
  useEffect(() => {
    if (ratios && !loading && Object.keys(ratios).length > 0) {
      const settleMs = showSlowSettle ? (60000 + Math.random() * 60000) : 2000;
      
      saveOrbTweenState({
        orbTarget: {
          gradient: JSON.stringify(ratios), // Use ratios as proxy for gradient state
          glow: glowColor,
          particles: particleColor,
        },
        tweenStartAt: Date.now(),
        settleMs,
      });
      
      if (!isFirstRender.current) {
        setShouldAnimate(true);
      }
    }
  }, [ratios, loading, showSlowSettle, glowColor, particleColor]);
  
  // Calculate halo opacity based on streak (0-7 days)
  const haloOpacity = Math.min(streak / 7, 1);
  const haloGlow = streak === 7 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
  
  // Slow-settle transition duration
  const settleTransition = (showSlowSettle && shouldAnimate) ? {
    duration: 60 + Math.random() * 60,
    ease: "easeInOut",
  } : {
    duration: shouldAnimate ? 2 : 0,
    ease: "easeInOut",
  };
  
  return (
    <motion.div
      ref={mergedRef}
      className={`relative cursor-pointer mood-orb-container ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Streak Halo Ring */}
      {streak > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full mood-orb-halo"
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
      
      {/* Main orb with canvas-based gradient and breathing animation */}
      <motion.div
        className={`absolute inset-0 rounded-full mood-orb-main overflow-hidden ${
          settings.highVisibility ? 'ring-3 ring-white ring-opacity-80' : ''
        }`}
        style={{
          boxShadow: settings.highVisibility 
            ? `0 0 40px ${glowColor}, 0 0 60px ${glowColor}, inset 0 0 20px rgba(0, 0, 0, 0.3)`
            : `0 0 30px ${glowColor}`,
          ['--orb-glow-color' as any]: glowColor,
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
          ...settleTransition,
        }}
      >
        {/* Canvas gradient layer */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            width: size,
            height: size,
            imageRendering: 'auto',
          }}
        />
        
        {/* Highlight overlay for 3D effect */}
        <div
          className="absolute inset-0 rounded-full opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 70% 30%, transparent 30%, rgba(255, 255, 255, 0.3) 70%)',
          }}
        />
        
        {/* Floating particles */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full opacity-60"
              style={{
                backgroundColor: particleColor,
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
          className="absolute inset-0 rounded-full border-2 opacity-0 pointer-events-none"
          style={{ borderColor: particleColor }}
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
        <div className="absolute inset-0 flex items-center justify-center text-center px-6 pointer-events-none">
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
          className="absolute bottom-2 right-2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 z-10"
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
