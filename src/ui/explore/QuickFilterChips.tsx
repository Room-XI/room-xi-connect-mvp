import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Info, X } from 'lucide-react';

interface QuickFilterChipsProps {
  activeFilters: Set<string>;
  onToggle: (filter: string) => void;
  onNearMeRequest: () => void;
  locationEnabled: boolean;
}

const CHIPS = [
  { key: 'free', label: 'Free' },
  { key: 'dropIn', label: 'Drop-in' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'nearMe', label: 'Near Me' },
];

export default function QuickFilterChips({
  activeFilters,
  onToggle,
  onNearMeRequest,
  locationEnabled,
}: QuickFilterChipsProps) {
  const [showLocationExplainer, setShowLocationExplainer] = useState(false);

  const handleChipClick = (key: string) => {
    if (key === 'nearMe' && !locationEnabled) {
      setShowLocationExplainer(true);
      return;
    }
    onToggle(key);
  };

  const handleLocationConfirm = () => {
    setShowLocationExplainer(false);
    onNearMeRequest();
    onToggle('nearMe');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => {
          const isActive = activeFilters.has(chip.key);
          return (
            <motion.button
              key={chip.key}
              onClick={() => handleChipClick(chip.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal text-white shadow-sm'
                  : 'bg-sage/10 text-deepSage hover:bg-sage/20'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={isActive}
            >
              {chip.key === 'nearMe' && <MapPin className="w-3.5 h-3.5" />}
              {chip.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showLocationExplainer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-teal/5 border border-teal/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-deepSage">
                    Show programs near you
                  </p>
                  <p className="text-xs text-textSecondaryLight mt-1">
                    We'll ask your browser for your location so we can show nearby programs.
                    Your location is only used for sorting and is never stored on our servers.
                  </p>
                </div>
                <button
                  onClick={() => setShowLocationExplainer(false)}
                  className="p-1 rounded hover:bg-sage/10"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-textSecondaryLight" />
                </button>
              </div>
              <div className="flex gap-2 ml-7">
                <button
                  onClick={handleLocationConfirm}
                  className="px-4 py-1.5 text-sm font-medium bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
                >
                  Allow location
                </button>
                <button
                  onClick={() => setShowLocationExplainer(false)}
                  className="px-4 py-1.5 text-sm font-medium text-textSecondaryLight hover:text-deepSage transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
