import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Info, Palette, Accessibility, Battery } from 'lucide-react';

interface MoodData {
  date: string;
  mood: 'cold' | 'stormy' | 'foggy' | 'clear' | 'breezy' | 'aurora' | null;
}

interface MoodOrbProps {
  moodData: MoodData[];
  streakCount?: number;
  highContrast?: boolean;
  reducedMotion?: boolean;
  showPatterns?: boolean;
  lowPowerMode?: boolean;
  lastCheckInTime?: string | null; // ISO string timestamp of last check-in
}

// Mood colors with HSL values for gradient blending
const MOOD_COLORS = {
  cold: { h: 210, s: 70, l: 45, hex: '#1e5f8e' },    // Deep blue
  stormy: { h: 280, s: 60, l: 40, hex: '#663399' },  // Purple
  foggy: { h: 200, s: 20, l: 60, hex: '#8899aa' },   // Gray-blue
  clear: { h: 60, s: 70, l: 60, hex: '#e6d35a' },    // Golden yellow
  breezy: { h: 160, s: 60, l: 50, hex: '#33b38e' },  // Teal green
  aurora: { h: 340, s: 80, l: 60, hex: '#eb5c85' },  // Pink-red
};

// Performance constants
const TARGET_FPS = 30;
const FRAME_DURATION = 1000 / TARGET_FPS;
const GRADIENT_CACHE_SIZE = 6;

export function MoodOrb({ 
  moodData, 
  streakCount = 0, 
  highContrast = false,
  reducedMotion = false,
  showPatterns = false,
  lowPowerMode = false,
  lastCheckInTime = null
}: MoodOrbProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gradientCacheRef = useRef<Map<string, CanvasGradient>>(new Map());
  const lastFrameTimeRef = useRef<number>(0);
  const staticImageRef = useRef<string | null>(null);
  const [showColorKey, setShowColorKey] = useState(false);
  const [dominantMood, setDominantMood] = useState<string>('clear');
  const [isAnimating, setIsAnimating] = useState(!lowPowerMode);
  const [localLowPowerMode, setLocalLowPowerMode] = useState(() => {
    // Load Low Power Mode preference from localStorage
    const saved = localStorage.getItem('mood-orb-low-power');
    return saved === 'true' || lowPowerMode;
  });
  
  // Detect OS reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  
  // Listen for changes in OS reduced motion setting
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Calculate mood ratios for the last 7 days
  const moodRatios = useMemo(() => {
    const counts: Record<string, number> = {
      cold: 0, stormy: 0, foggy: 0, clear: 0, breezy: 0, aurora: 0
    };
    
    // Count moods from the last 7 days
    const last7Days = moodData.slice(-7);
    last7Days.forEach(day => {
      if (day.mood && day.mood in counts) {
        counts[day.mood]++;
      }
    });

    // Calculate ratios and find dominant mood
    const ratios: Record<string, number> = {};
    let maxCount = 0;
    let dominant = 'clear';
    
    Object.entries(counts).forEach(([mood, count]) => {
      ratios[mood] = count / 7;
      if (count > maxCount) {
        maxCount = count;
        dominant = mood;
      }
    });

    setDominantMood(dominant);
    return ratios;
  }, [moodData]);

  // Update Low Power Mode effect
  useEffect(() => {
    const effectiveLowPower = lowPowerMode || localLowPowerMode;
    setIsAnimating(!effectiveLowPower);
    localStorage.setItem('mood-orb-low-power', effectiveLowPower.toString());
  }, [lowPowerMode, localLowPowerMode]);

  // Toggle Low Power Mode locally
  const toggleLowPowerMode = useCallback(() => {
    setLocalLowPowerMode(prev => {
      const newValue = !prev;
      localStorage.setItem('mood-orb-low-power', newValue.toString());
      setIsAnimating(!newValue);
      return newValue;
    });
  }, []);

  // Breathing animation parameters
  const breathingCycle = 8000; // 8 seconds
  
  // Calculate settle time based on last check-in
  // 10-12 minutes normally, 2 minutes for reduced motion, instant for low power mode
  const calculateSettleTime = useCallback(() => {
    if (localLowPowerMode) return 0;
    if (reducedMotion || prefersReducedMotion) return 120000; // 2 minutes for reduced motion
    
    // Default to 11 minutes (middle of 10-12 minute range)
    const defaultSettleTime = 11 * 60 * 1000; // 11 minutes in ms
    
    // If we have a last check-in time, calculate time since check-in
    if (lastCheckInTime) {
      const timeSinceCheckIn = Date.now() - new Date(lastCheckInTime).getTime();
      // If less than settle time has passed, continue settling
      if (timeSinceCheckIn < defaultSettleTime) {
        return defaultSettleTime - timeSinceCheckIn;
      }
    }
    
    return defaultSettleTime;
  }, [localLowPowerMode, reducedMotion, prefersReducedMotion, lastCheckInTime]);
  
  const settleTime = calculateSettleTime();
  

  // Create gradient with caching
  const createCachedGradient = useCallback((
    ctx: CanvasRenderingContext2D,
    mood: string,
    centerX: number,
    centerY: number,
    radius: number,
    opacity: number
  ): CanvasGradient => {
    const cacheKey = `${mood}-${radius.toFixed(0)}-${opacity.toFixed(2)}`;
    
    if (gradientCacheRef.current.has(cacheKey)) {
      return gradientCacheRef.current.get(cacheKey)!;
    }

    const color = MOOD_COLORS[mood as keyof typeof MOOD_COLORS];
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    
    gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${opacity})`);
    gradient.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${opacity * 0.7})`);
    gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.l}%, 0)`);

    // Limit cache size
    if (gradientCacheRef.current.size >= GRADIENT_CACHE_SIZE * 3) {
      const firstKey = gradientCacheRef.current.keys().next().value;
      if (firstKey) {
        gradientCacheRef.current.delete(firstKey);
      }
    }

    gradientCacheRef.current.set(cacheKey, gradient);
    return gradient;
  }, []);

  // Pre-bake static layers on offscreen canvas
  const prebakeStaticLayers = useCallback((
    width: number,
    height: number,
    dominantColor: any,
    moodRatios: Record<string, number>,
    radius: number
  ) => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    
    const offscreen = offscreenCanvasRef.current;
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d')!;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear offscreen canvas
    offCtx.clearRect(0, 0, width, height);
    
    // Draw ambient background
    offCtx.fillStyle = `hsla(${dominantColor.h}, ${dominantColor.s}%, ${dominantColor.l}%, 0.25)`;
    offCtx.fillRect(0, 0, width, height);
    
    // Enable screen blending
    offCtx.globalCompositeOperation = 'screen';
    
    // Draw mood layers
    Object.entries(moodRatios).forEach(([mood, ratio]) => {
      if (ratio > 0) {
        const opacity = Math.min(0.9, Math.max(0.3, 0.3 + ratio * 0.6));
        const gradient = createCachedGradient(offCtx, mood, centerX, centerY, radius, opacity);
        offCtx.fillStyle = gradient;
        offCtx.fillRect(0, 0, width, height);
      }
    });
    
    // Reset composite operation
    offCtx.globalCompositeOperation = 'source-over';
    
    return offscreen;
  }, [createCachedGradient]);

  // Optimized draw function
  const drawOrb = useCallback((ctx: CanvasRenderingContext2D, time: number, forceStatic: boolean = false) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.35;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate breathing effect or use static scale
    const breathScale = (forceStatic || localLowPowerMode || reducedMotion) 
      ? 1 
      : 1 + Math.sin(time / breathingCycle * Math.PI * 2) * 0.05;
    const radius = baseRadius * breathScale;

    const dominantColor = MOOD_COLORS[dominantMood as keyof typeof MOOD_COLORS];
    
    // For Low Power Mode, use pre-baked static image
    if (forceStatic || localLowPowerMode) {
      const prebaked = prebakeStaticLayers(width, height, dominantColor, moodRatios, radius);
      ctx.drawImage(prebaked, 0, 0);
    } else {
      // Dynamic rendering with gradient caching
      ctx.fillStyle = `hsla(${dominantColor.h}, ${dominantColor.s}%, ${dominantColor.l}%, 0.25)`;
      ctx.fillRect(0, 0, width, height);
      
      // Enable screen blending
      ctx.globalCompositeOperation = 'screen';
      
      // Draw mood layers with cached gradients
      Object.entries(moodRatios).forEach(([mood, ratio]) => {
        if (ratio > 0) {
          const opacity = Math.min(0.9, Math.max(0.3, 0.3 + ratio * 0.6));
          const gradient = createCachedGradient(ctx, mood, centerX, centerY, radius, opacity);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }
      });
      
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
    }

    // Draw orb circle outline
    ctx.strokeStyle = highContrast ? '#000' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = highContrast ? 3 : 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw streak halo if applicable (0-7 days)
    if (streakCount > 0) {
      const haloIntensity = Math.min(1, streakCount / 7);
      ctx.strokeStyle = `rgba(255, 215, 0, ${haloIntensity * 0.6})`;
      ctx.lineWidth = 2 + streakCount;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 10 + streakCount * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw accessibility patterns if enabled
    if (showPatterns) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      
      // Warm moods get dots
      if (['clear', 'breezy', 'aurora'].includes(dominantMood)) {
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radius * 0.7;
          const y = centerY + Math.sin(angle) * radius * 0.7;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } 
      // Cool moods get lines
      else {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(
            centerX + Math.cos(angle) * radius * 0.3,
            centerY + Math.sin(angle) * radius * 0.3
          );
          ctx.lineTo(
            centerX + Math.cos(angle) * radius * 0.9,
            centerY + Math.sin(angle) * radius * 0.9
          );
          ctx.stroke();
        }
      }
      
      ctx.restore();
    }
  }, [dominantMood, highContrast, moodRatios, showPatterns, streakCount, localLowPowerMode, createCachedGradient, prebakeStaticLayers]);

  // Optimized animation loop with frame rate limiting
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { 
      alpha: true,
      desynchronized: true // Hint to browser for better performance
    });
    if (!ctx) return;

    // Set canvas size with devicePixelRatio for sharpness
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
    canvas.width = 300 * dpr;
    canvas.height = 300 * dpr;
    canvas.style.width = '300px';
    canvas.style.height = '300px';
    ctx.scale(dpr, dpr);

    let startTime = Date.now();
    let lastDrawTime = 0;
    let frameCount = 0;
    let isStatic = false;
    
    // For Low Power Mode, draw once and stop
    if (localLowPowerMode) {
      drawOrb(ctx, 0, true);
      // Generate static image for efficiency
      staticImageRef.current = canvas.toDataURL();
      return;
    }
    
    const animate = () => {
      const currentTime = Date.now();
      const timeSinceStart = currentTime - startTime;
      
      // Frame rate limiting - skip frame if too soon
      if (currentTime - lastDrawTime < FRAME_DURATION) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Settle to static after settle time
      if (settleTime > 0 && timeSinceStart > settleTime && !isStatic) {
        isStatic = true;
        drawOrb(ctx, timeSinceStart, true);
        staticImageRef.current = canvas.toDataURL();
        setIsAnimating(false);
        return; // Stop animation loop
      }
      
      // Draw frame
      drawOrb(ctx, timeSinceStart, isStatic);
      lastDrawTime = currentTime;
      frameCount++;
      
      // Track frame timing for performance metrics
      if (frameCount % 60 === 0) {
        lastFrameTimeRef.current = currentTime;
      }
      
      // Continue animation
      if (!isStatic && isAnimating) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (isAnimating) {
      animate();
    } else {
      // Draw static frame when not animating
      drawOrb(ctx, 0, true);
      staticImageRef.current = canvas.toDataURL();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [moodRatios, dominantMood, streakCount, highContrast, showPatterns, reducedMotion, localLowPowerMode, isAnimating, settleTime, drawOrb]);

  return (
    <div className="relative">
      {/* Main Orb Canvas */}
      <motion.div 
        className="relative mx-auto"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <canvas 
          ref={canvasRef}
          className="w-full max-w-[300px] h-auto rounded-full"
          role="img"
          aria-label={t('mood.orbVisualization', { mood: dominantMood, streak: streakCount })}
          aria-describedby="mood-orb-description"
        />
        <span id="mood-orb-description" className="sr-only">
          {t('mood.orbDescription', { 
            mood: dominantMood, 
            animating: isAnimating ? 'animated' : 'static' 
          })}
        </span>
      </motion.div>

      {/* Controls */}
      <div className="mt-4 flex justify-center space-x-2">
        <button
          onClick={() => setShowColorKey(!showColorKey)}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={t('mood.showColorKey')}
        >
          <Palette className="w-5 h-5" />
        </button>
        <button
          onClick={() => {}}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={t('mood.togglePatterns')}
        >
          <Accessibility className="w-5 h-5" />
        </button>
        <button
          onClick={toggleLowPowerMode}
          className={`p-2 rounded-lg transition-colors ${
            localLowPowerMode 
              ? 'bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700' 
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          aria-label={localLowPowerMode ? t('mood.disableLowPowerMode') : t('mood.enableLowPowerMode')}
          title={localLowPowerMode ? 'Low Power Mode: ON' : 'Low Power Mode: OFF'}
        >
          <Battery className={`w-5 h-5 ${localLowPowerMode ? 'text-green-600' : ''}`} />
        </button>
        <button
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={t('mood.orbInfo')}
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Color Key Drawer */}
      {showColorKey && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        >
          <h3 className="font-semibold mb-2">{t('mood.colorKey')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(MOOD_COLORS).map(([mood, color]) => (
              <div key={mood} className="flex items-center space-x-2">
                <div 
                  className="w-6 h-6 rounded-full border"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-sm capitalize">{t(`mood.${mood}`)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
            {t('mood.ratioExplanation', { days: 7 })}
          </p>
        </motion.div>
      )}
    </div>
  );
}