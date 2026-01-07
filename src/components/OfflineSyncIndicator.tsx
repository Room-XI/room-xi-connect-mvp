import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useQueue } from '@/lib/queue';

export default function OfflineSyncIndicator() {
  const { itemCount, isOnline, sync } = useQueue();
  
  const showOffline = !isOnline;
  const showSyncing = isOnline && itemCount > 0;
  const showNothing = isOnline && itemCount === 0;

  if (showNothing) return null;

  return (
    <AnimatePresence>
      {showOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-coral/90 text-white px-4 py-2 shadow-md"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            <span>You're offline</span>
            {itemCount > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {itemCount} pending
              </span>
            )}
          </div>
        </motion.div>
      )}

      {showSyncing && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-teal/90 text-white px-4 py-2 shadow-md"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </motion.div>
            <span>Syncing {itemCount} item{itemCount !== 1 ? 's' : ''}...</span>
            <button
              onClick={() => sync()}
              className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs transition-colors"
              aria-label="Retry sync"
            >
              Retry
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
