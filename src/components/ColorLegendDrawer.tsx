/**
 * Color Legend Drawer
 * Accessible drawer showing all 6 mood colors with meanings
 * Keyboard navigable and WCAG AA compliant
 */

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { MOODS } from '@/lib/moodConfig';

interface ColorLegendDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ColorLegendDrawer({ isOpen, onClose }: ColorLegendDrawerProps) {
  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-legend-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2
            id="color-legend-title"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            Mood Colors
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Close color legend"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            The Mood Orb blends all 6 colors based on your check-ins from the past week. 
            Each color represents a different emotional tone — not good or bad, just different.
          </p>

          {/* Mood Grid */}
          <div className="space-y-4">
            {MOODS.map((mood) => {
              const { h, s, l } = mood.color;
              const bgColor = `hsl(${h}, ${s}%, ${l}%)`;
              const textColor = l > 50 ? '#000000' : '#FFFFFF';

              return (
                <div
                  key={mood.label}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  {/* Color Swatch */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-semibold shadow-lg"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      boxShadow: `0 0 20px ${bgColor}40`,
                    }}
                    aria-label={`${mood.label} color swatch`}
                  >
                    {mood.emoji}
                  </div>

                  {/* Description */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                      {mood.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {getMoodDescription(mood.label)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Educational Note */}
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
            <h4 className="font-semibold text-teal-900 dark:text-teal-100 mb-2">
              Why all 6 colors?
            </h4>
            <p className="text-sm text-teal-800 dark:text-teal-200">
              Emotions are complex and layered. The Mood Orb reflects your emotional range by 
              blending all the moods you've experienced, showing the full picture — not just one feeling.
            </p>
          </div>

          {/* Privacy Note */}
          <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <strong>Privacy:</strong> Your mood colors are private and never shared unless you choose to.
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Get user-friendly descriptions for each mood
 */
function getMoodDescription(mood: string): string {
  const descriptions: Record<string, string> = {
    aurora: 'Energized, focused, and ready to take on the world',
    breezy: 'Light-hearted, expressive, and flowing with ease',
    clear: 'Calm, centered, and balanced',
    foggy: 'Reflective, inward, and processing',
    stormy: 'Heavy, turbulent, or feeling stuck',
    cold: 'Low energy, withdrawn, or needing rest',
  };

  return descriptions[mood] || 'A mood state';
}
