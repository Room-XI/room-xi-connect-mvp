import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Info, Palette, Accessibility } from 'lucide-react';

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

export function MoodOrb({ 
  moodData, 
  streakCount = 0, 
  highContrast = false,
  reducedMotion = false,
  showPatterns = false
}: MoodOrbProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [showColorKey, setShowColorKey] = useState(false);
  const [dominantMood, setDominantMood] = useState<string>('clear');
  const [isAnimating, setIsAnimating] = useState(true);

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

  // Breathing animation parameters
  const breathingCycle = 8000; // 8 seconds
  const settleTime = reducedMotion ? 0 : (isAnimating ? 600000 : 120000); // 10 min initial, 2 min after

  // Draw the mood orb with gradient layers
  const drawOrb = (ctx: CanvasRenderingContext2D, time: number) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.35;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Breathing effect
    const breathScale = reducedMotion ? 1 : 1 + Math.sin(time / breathingCycle * Math.PI * 2) * 0.05;
    const radius = baseRadius * breathScale;

    // Draw ambient background (25% opacity of dominant mood)
    const dominantColor = MOOD_COLORS[dominantMood as keyof typeof MOOD_COLORS];
    ctx.fillStyle = `hsla(${dominantColor.h}, ${dominantColor.s}%, ${dominantColor.l}%, 0.25)`;
    ctx.fillRect(0, 0, width, height);

    // Enable screen blending for gradient layers
    ctx.globalCompositeOperation = 'screen';

    // Draw each mood layer
    Object.entries(moodRatios).forEach(([mood, ratio]) => {
      if (ratio > 0) {
        const color = MOOD_COLORS[mood as keyof typeof MOOD_COLORS];
        const opacity = Math.min(0.9, Math.max(0.3, 0.3 + ratio * 0.6));
        
        // Create radial gradient for this mood
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius
        );
        
        gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${opacity})`);
        gradient.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${opacity * 0.7})`);
        gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.l}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    });

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

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
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 300;
    canvas.height = 300;

    let startTime = Date.now();
    
    const animate = () => {
      const time = Date.now() - startTime;
      drawOrb(ctx, time);
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Settle animation after specified time
    const settleTimeout = setTimeout(() => {
      setIsAnimating(false);
    }, settleTime);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(settleTimeout);
    };
  }, [moodRatios, dominantMood, streakCount, highContrast, showPatterns, reducedMotion]);

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
          aria-label={t('mood.orbVisualization')}
        />
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
          onClick={() => {
            const newValue = !showPatterns;
            // This would normally update a parent state or preference
            console.log('Toggle patterns:', newValue);
          }}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={t('mood.togglePatterns')}
        >
          <Accessibility className="w-5 h-5" />
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