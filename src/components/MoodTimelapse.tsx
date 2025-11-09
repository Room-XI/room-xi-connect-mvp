/**
 * Mood Timelapse - 30-day orb history with date scrubber
 * Respects reduced motion preference
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import GradientMoodOrb from './GradientMoodOrb';
import { useHistoricalMoodData } from '@/hooks/useHistoricalMoodData';

interface MoodTimelapseProps {
  className?: string;
}

export default function MoodTimelapse({ className = '' }: MoodTimelapseProps) {
  const [currentDayOffset, setCurrentDayOffset] = useState(0); // 0 = today, 1 = yesterday, etc.
  
  const { summary, loading } = useHistoricalMoodData({ dayOffset: currentDayOffset });

  const currentDate = DateTime.now().setZone('America/Edmonton').minus({ days: currentDayOffset });
  const canGoBack = currentDayOffset < 30;
  const canGoForward = currentDayOffset > 0;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Mood History
      </h3>
      
      {/* Date Scrubber */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => canGoBack && setCurrentDayOffset(currentDayOffset + 1)}
          disabled={!canGoBack}
          className={`p-2 rounded-lg transition-colors ${
            canGoBack
              ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }`}
          aria-label="Go back one day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {currentDayOffset === 0 ? 'Today' : currentDayOffset === 1 ? 'Yesterday' : currentDate.toFormat('MMMM d')}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {currentDate.toFormat('EEEE')}
          </div>
        </div>

        <button
          onClick={() => canGoForward && setCurrentDayOffset(currentDayOffset - 1)}
          disabled={!canGoForward}
          className={`p-2 rounded-lg transition-colors ${
            canGoForward
              ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }`}
          aria-label="Go forward one day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Orb Display */}
      <motion.div
        key={currentDayOffset}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="flex justify-center items-center relative"
        style={{ minHeight: '240px' }}
      >
        {loading ? (
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        ) : summary?.ratios ? (
          <GradientMoodOrb
            size={200}
            showSlowSettle={false}
            overrideRatios={summary.ratios}
          />
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No mood data for this week</p>
          </div>
        )}
      </motion.div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
        {summary && summary.daysWithData > 0 
          ? `${summary.daysWithData} check-in${summary.daysWithData !== 1 ? 's' : ''} in the 7 days ending ${currentDate.toFormat('MMM d, yyyy')}`
          : `No check-ins in the 7 days ending ${currentDate.toFormat('MMM d, yyyy')}`
        }
      </p>
    </div>
  );
}
