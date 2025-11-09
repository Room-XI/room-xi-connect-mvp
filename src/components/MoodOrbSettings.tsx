/**
 * Mood Orb Accessibility Settings
 * Provides toggles for high-visibility mode, pattern overlay, and color legend
 */

import { useMoodOrbSettings } from '@/hooks/useMoodOrbSettings';

export default function MoodOrbSettings() {
  const { settings, loading, updateSetting } = useMoodOrbSettings();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Mood Orb Accessibility
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Customize how the Mood Orb appears to improve visibility and accessibility.
        </p>
      </div>

      {/* High Visibility Toggle */}
      <label className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
        <div className="flex-1 mr-4">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            High-Visibility Mode
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Adds a 3px outline and enhanced shadow to the Mood Orb for better visibility
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.highVisibility}
          onChange={(e) => updateSetting('highVisibility', e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-2"
          aria-label="Toggle high-visibility mode"
        />
      </label>

      {/* Pattern Overlay Toggle */}
      <label className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
        <div className="flex-1 mr-4">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            Pattern Overlay
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Adds dots (warm colors) and lines (cool colors) for color-blind accessibility
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.patternOverlay}
          onChange={(e) => updateSetting('patternOverlay', e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-2"
          aria-label="Toggle pattern overlay"
        />
      </label>

      {/* Color Key Toggle */}
      <label className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
        <div className="flex-1 mr-4">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            Show Color Legend
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Display a drawer with color meanings when viewing the Mood Orb
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.showColorKey}
          onChange={(e) => updateSetting('showColorKey', e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-2"
          aria-label="Toggle color legend"
        />
      </label>

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
        <strong>Privacy Note:</strong> These settings adjust how the Mood Orb is displayed to you only. 
        No additional data is collected or shared when these options are enabled.
      </div>
    </div>
  );
}
