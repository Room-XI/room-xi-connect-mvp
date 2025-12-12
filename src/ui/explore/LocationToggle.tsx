import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export interface LocationToggleProps {
  enabled: boolean;
  onToggle: () => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  permissionState: 'prompt' | 'granted' | 'denied';
  onRetryPermission?: () => void;
}

const RADIUS_OPTIONS = [
  { km: 1, label: '1km', walkTime: '~12 min walk' },
  { km: 2, label: '2km', walkTime: '~25 min walk' },
  { km: 5, label: '5km', walkTime: '~60 min / transit' },
];

export default function LocationToggle({
  enabled,
  onToggle,
  radiusKm,
  onRadiusChange,
  permissionState,
  onRetryPermission,
}: LocationToggleProps) {
  const selectedOption = RADIUS_OPTIONS.find(opt => opt.km === radiusKm) || RADIUS_OPTIONS[1];

  if (permissionState === 'denied') {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-coral/5 border border-coral/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-coral" />
          <span className="text-sm text-coral font-medium">Location access denied</span>
        </div>
        {onRetryPermission && (
          <button
            onClick={onRetryPermission}
            aria-label="Retry location permission request"
            className="flex items-center gap-1 text-xs font-medium text-teal hover:text-teal/80 transition-colors"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-sage/5 border border-sage/20">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-teal" />
          <span className="text-sm font-medium text-deepSage">Show nearby</span>
        </div>
        
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={enabled}
          aria-label={`Show nearby programs: ${enabled ? 'enabled' : 'disabled'}`}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${enabled ? 'bg-teal' : 'bg-sage/30'}
          `}
        >
          <motion.div
            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
            animate={{ x: enabled ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      <AnimatePresence>
        {enabled && permissionState === 'granted' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex gap-1">
                {RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option.km}
                    onClick={() => onRadiusChange(option.km)}
                    aria-pressed={radiusKm === option.km}
                    aria-label={`Set search radius to ${option.km} kilometers, ${option.walkTime}`}
                    className={`
                      px-3 py-1 text-xs font-medium rounded-full transition-all duration-200
                      ${radiusKm === option.km
                        ? 'bg-teal text-white shadow-sm'
                        : 'bg-sage/10 text-textSecondaryLight hover:bg-sage/20'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-textSecondaryLight ml-auto">
                {selectedOption.walkTime}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
