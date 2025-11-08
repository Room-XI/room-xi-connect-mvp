import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, X, TrendingUp } from 'lucide-react';
import { DateTime } from 'luxon';
import { useMoodGradient } from '@/hooks/useMoodGradient';
import { getMoodByScore } from '@/lib/moodConfig';

interface WeeklySnapshotCardProps {
  onClose: () => void;
}

/**
 * Weekly Snapshot Card
 * Appears every Sunday at 8am Edmonton time
 * Shows color ratio bar + streak summary for the past week
 */
export default function WeeklySnapshotCard({ onClose }: WeeklySnapshotCardProps) {
  const { moodBlend, checkIns } = useMoodGradient();
  const [weekRange, setWeekRange] = useState('');

  useEffect(() => {
    // Calculate week range
    const now = DateTime.now().setZone('America/Edmonton');
    const weekStart = now.minus({ days: 7 }).toFormat('MMM d');
    const weekEnd = now.toFormat('MMM d');
    setWeekRange(`${weekStart} - ${weekEnd}`);
  }, []);

  // Calculate color ratio for visualization
  const totalCheckIns = checkIns.length;
  const distribution = moodBlend?.distribution || {};

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
        initial={{ y: 50 }}
        animate={{ y: 0 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close snapshot"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Weekly Snapshot</h2>
            <p className="text-sm text-gray-600">{weekRange}</p>
          </div>
        </div>

        {/* Check-in count */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Check-Ins This Week</p>
              <p className="text-3xl font-bold text-gray-900">{totalCheckIns}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-teal-600" />
          </div>
          {totalCheckIns === 7 && (
            <p className="text-sm text-teal-700 font-medium mt-2">
              🔥 Perfect week! You checked in every day!
            </p>
          )}
        </div>

        {/* Color Ratio Bar */}
        {totalCheckIns > 0 ? (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Your Mood Balance</p>
            <div className="h-12 rounded-lg overflow-hidden flex">
              {Object.entries(distribution).map(([label, count]) => {
                const mood = [1, 2, 3, 4, 5, 6]
                  .map(score => getMoodByScore(score))
                  .find(m => m.label === label);
                
                if (!mood) return null;
                
                const percentage = (count / totalCheckIns) * 100;
                
                return (
                  <div
                    key={label}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: `hsl(${mood.color.h}, ${mood.color.s}%, ${mood.color.l}%)`,
                    }}
                    className="relative group"
                    title={`${label}: ${count} check-in${count !== 1 ? 's' : ''}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {Object.entries(distribution).map(([label, count]) => {
                const mood = [1, 2, 3, 4, 5, 6]
                  .map(score => getMoodByScore(score))
                  .find(m => m.label === label);
                
                if (!mood) return null;
                
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: `hsl(${mood.color.h}, ${mood.color.s}%, ${mood.color.l}%)`,
                      }}
                    />
                    <span className="text-xs text-gray-600">
                      {mood.emoji} {label} ({count})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center mb-6">
            <p className="text-gray-600">No check-ins this week yet.</p>
            <p className="text-sm text-gray-500 mt-1">Start tracking your mood to see your weekly snapshot!</p>
          </div>
        )}

        {/* Encouragement message */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
          <p className="text-sm text-gray-700">
            {totalCheckIns >= 5
              ? "Amazing consistency! Keep building that self-awareness. 🌟"
              : totalCheckIns >= 3
              ? "You're building a great habit! Keep it up! 💪"
              : "Every check-in is a step toward understanding yourself better. 🌱"}
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors"
        >
          Got it!
        </button>
      </motion.div>
    </motion.div>
  );
}
