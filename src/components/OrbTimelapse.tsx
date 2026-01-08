import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Play, Pause, SkipBack, Calendar, Info, ChevronLeft } from 'lucide-react';
import { DateTime } from 'luxon';
import api from '@/lib/api';
import { MOOD_COLORS } from '@/lib/moodConfig';
import { useNavigate } from 'react-router-dom';

interface DailyMoodData {
  date: string;
  moodType: string | null;
  moodLevel: number | null;
  dominantMood?: string;
  moodRatios?: Record<string, number>;
}

interface TimelapseControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  currentDay: number;
  totalDays: number;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

function TimelapseControls({ 
  isPlaying, 
  onPlayPause, 
  onRestart, 
  currentDay, 
  totalDays, 
  playbackSpeed,
  onSpeedChange 
}: TimelapseControlsProps) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-4">
        <motion.button
          onClick={onRestart}
          className="p-3 rounded-full bg-sage/10 hover:bg-sage/20 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t('timelapse.restart')}
        >
          <SkipBack className="w-5 h-5 text-deepSage" />
        </motion.button>
        
        <motion.button
          onClick={onPlayPause}
          className="p-4 rounded-full bg-teal text-white hover:bg-teal/90 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isPlaying ? t('timelapse.pause') : t('timelapse.play')}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </motion.button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-textSecondaryLight">
          <span>Day {currentDay + 1} of {totalDays}</span>
          <span>Speed: {playbackSpeed}x</span>
        </div>
        
        <div className="bg-sage/10 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-teal"
            style={{ width: `${((currentDay + 1) / totalDays) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        <div className="flex justify-center space-x-2 mt-2">
          {[0.5, 1, 2, 4].map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                playbackSpeed === speed
                  ? 'bg-teal text-white'
                  : 'bg-sage/10 text-textSecondaryLight hover:bg-sage/20'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrbTimelapse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [moodHistory, setMoodHistory] = useState<DailyMoodData[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const transitionProgressRef = useRef(0);
  
  // Fetch mood history for the last 30 days
  useEffect(() => {
    const fetchMoodHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch check-ins for the last 30 days
        const { data, error: fetchError } = await api.checkins.list();
        
        if (fetchError) {
          throw new Error(fetchError);
        }
        
        // Process the data into daily mood data
        const dailyData: DailyMoodData[] = [];
        
        // Create an entry for each of the last 30 days
        for (let i = 29; i >= 0; i--) {
          const date = DateTime.now()
            .setZone('America/Edmonton')
            .minus({ days: i })
            .toISODate();
          
          const dayData = data?.find((checkin: any) => 
            DateTime.fromISO(checkin.timestamp).toISODate() === date
          );
          
          if (dayData) {
            dailyData.push({
              date: date || '',
              moodType: dayData.moodType || null,
              moodLevel: dayData.moodLevel16 || null,
            });
          } else {
            dailyData.push({
              date: date || '',
              moodType: null,
              moodLevel: null,
            });
          }
        }
        
        setMoodHistory(dailyData);
        
        // Also fetch weekly snapshots if available
        try {
          const response = await fetch('/api/orb-snapshots/recent');
          if (response.ok) {
            const snapshots = await response.json();
            // Enhance daily data with weekly snapshot information
            snapshots.forEach((snapshot: any) => {
              const snapshotDate = snapshot.snapshot_date;
              const dayIndex = dailyData.findIndex(d => d.date === snapshotDate);
              if (dayIndex !== -1) {
                dailyData[dayIndex].dominantMood = snapshot.dominant_mood;
                dailyData[dayIndex].moodRatios = {
                  cold: parseFloat(snapshot.cold_ratio),
                  stormy: parseFloat(snapshot.stormy_ratio),
                  foggy: parseFloat(snapshot.foggy_ratio),
                  clear: parseFloat(snapshot.clear_ratio),
                  breezy: parseFloat(snapshot.breezy_ratio),
                  aurora: parseFloat(snapshot.aurora_ratio),
                };
              }
            });
          }
        } catch (err) {
        }
        
      } catch (err) {
        console.error('Error fetching mood history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load mood history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMoodHistory();
  }, []);
  
  // Drawing function for the orb
  const drawOrbForDay = useCallback((
    ctx: CanvasRenderingContext2D,
    dayData: DailyMoodData,
    nextDayData: DailyMoodData | null,
    transitionProgress: number
  ) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.35;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Default to clear mood if no data
    const currentMood = dayData.moodType || 'clear';
    const nextMood = nextDayData?.moodType || currentMood;
    
    // Capitalize first letter for MOOD_COLORS access (keys are 'Clear', not 'clear')
    const capitalizedCurrentMood = currentMood.charAt(0).toUpperCase() + currentMood.slice(1);
    const capitalizedNextMood = nextMood.charAt(0).toUpperCase() + nextMood.slice(1);
    
    // Get colors for current and next mood
    const currentColor = MOOD_COLORS[capitalizedCurrentMood] || MOOD_COLORS.Clear;
    const nextColor = MOOD_COLORS[capitalizedNextMood] || currentColor;
    
    // Interpolate colors based on transition progress
    const h = currentColor.h + (nextColor.h - currentColor.h) * transitionProgress;
    const s = currentColor.s + (nextColor.s - currentColor.s) * transitionProgress;
    const l = currentColor.l + (nextColor.l - currentColor.l) * transitionProgress;
    
    // Draw ambient background
    ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, 0.25)`;
    ctx.fillRect(0, 0, width, height);
    
    // Draw main orb gradient
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, baseRadius
    );
    
    gradient.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, 0.9)`);
    gradient.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, 0.6)`);
    gradient.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw orb circle outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw date label
    ctx.fillStyle = '#333';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    const dateStr = DateTime.fromISO(dayData.date).toFormat('LLL dd');
    ctx.fillText(dateStr, centerX, height - 20);
    
    // Draw mood label if available
    if (dayData.moodType) {
      ctx.fillStyle = `hsl(${currentColor.h}, ${currentColor.s}%, ${currentColor.l}%)`;
      ctx.font = 'bold 16px system-ui';
      ctx.fillText(dayData.moodType.charAt(0).toUpperCase() + dayData.moodType.slice(1), centerX, 30);
    }
  }, []);
  
  // Animation loop
  const animate = useCallback(() => {
    if (!canvasRef.current || !isPlaying || currentDay >= moodHistory.length - 1) {
      setIsPlaying(false);
      return;
    }
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastFrameTimeRef.current;
    
    // Calculate how much to progress based on playback speed
    const progressPerMs = playbackSpeed / 1000; // Progress per millisecond
    transitionProgressRef.current += deltaTime * progressPerMs;
    
    // Check if we should move to the next day
    if (transitionProgressRef.current >= 1) {
      transitionProgressRef.current = 0;
      setCurrentDay(prev => Math.min(prev + 1, moodHistory.length - 1));
    }
    
    // Draw the current frame
    const currentDayData = moodHistory[currentDay];
    const nextDayData = currentDay < moodHistory.length - 1 ? moodHistory[currentDay + 1] : null;
    drawOrbForDay(ctx, currentDayData, nextDayData, transitionProgressRef.current);
    
    lastFrameTimeRef.current = currentTime;
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, currentDay, moodHistory, playbackSpeed, drawOrbForDay]);
  
  // Handle animation start/stop
  useEffect(() => {
    if (isPlaying && moodHistory.length > 0) {
      lastFrameTimeRef.current = Date.now();
      transitionProgressRef.current = 0;
      animate();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);
  
  // Draw initial frame
  useEffect(() => {
    if (!canvasRef.current || moodHistory.length === 0) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasRef.current.width = 300 * dpr;
    canvasRef.current.height = 300 * dpr;
    canvasRef.current.style.width = '300px';
    canvasRef.current.style.height = '300px';
    ctx.scale(dpr, dpr);
    
    // Draw current day
    drawOrbForDay(ctx, moodHistory[currentDay], null, 0);
  }, [moodHistory, currentDay, drawOrbForDay]);
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleRestart = () => {
    setCurrentDay(0);
    transitionProgressRef.current = 0;
    setIsPlaying(false);
    
    if (canvasRef.current && moodHistory.length > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawOrbForDay(ctx, moodHistory[0], null, 0);
      }
    }
  };
  
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-48 h-48 mx-auto bg-sage/10 rounded-full animate-pulse" />
          <p className="text-textSecondaryLight">{t('timelapse.loading')}</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="cosmic-button"
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
          aria-label={t('common.goBack')}
        >
          <ChevronLeft className="w-5 h-5 text-textSecondaryLight" />
        </button>
        <h1 className="text-xl font-display font-bold text-deepSage">
          {t('timelapse.title')}
        </h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>
      
      {/* Info Card */}
      <motion.div
        className="cosmic-card p-4 space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-deepSage font-medium">
              {t('timelapse.description')}
            </p>
            <p className="text-xs text-textSecondaryLight">
              {t('timelapse.instructions')}
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Orb Display */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="rounded-full shadow-lg"
            style={{ width: '300px', height: '300px' }}
            aria-label={t('timelapse.orbVisualization')}
          />
          
          {/* Calendar indicator */}
          <div className="absolute top-4 right-4 p-2 bg-white/80 rounded-lg">
            <Calendar className="w-4 h-4 text-deepSage" />
          </div>
        </div>
      </motion.div>
      
      {/* Controls */}
      <motion.div
        className="cosmic-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <TimelapseControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onRestart={handleRestart}
          currentDay={currentDay}
          totalDays={moodHistory.length}
          playbackSpeed={playbackSpeed}
          onSpeedChange={handleSpeedChange}
        />
      </motion.div>
      
      {/* Mood Key */}
      <motion.div
        className="cosmic-card p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <h3 className="font-semibold text-deepSage mb-3">{t('mood.colorKey')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(MOOD_COLORS).map(([mood, color]) => (
            <div key={mood} className="flex items-center space-x-2">
              <div
                className="w-5 h-5 rounded-full border"
                style={{ backgroundColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)` }}
              />
              <span className="text-xs capitalize text-textSecondaryLight">
                {t(`mood.${mood}`)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}