import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';

const SNAPSHOT_KEY = 'lastSnapshotShown';

/**
 * Hook to manage Weekly Snapshot Card display
 * Shows card once per week on Sunday at 8am Edmonton time
 */
export function useWeeklySnapshot() {
  const [showSnapshot, setShowSnapshot] = useState(false);

  useEffect(() => {
    checkShouldShowSnapshot();
  }, []);

  const checkShouldShowSnapshot = () => {
    const now = DateTime.now().setZone('America/Edmonton');
    
    // Check if it's Sunday
    if (now.weekday !== 7) {
      return;
    }
    
    // Check if it's after 8am
    if (now.hour < 8) {
      return;
    }
    
    // Check if we've already shown it this week
    const lastShown = localStorage.getItem(SNAPSHOT_KEY);
    if (lastShown) {
      const lastShownDate = DateTime.fromISO(lastShown);
      const weekStart = now.startOf('week');
      
      // If we've shown it this week, don't show again
      if (lastShownDate >= weekStart) {
        return;
      }
    }
    
    // Show the snapshot!
    setShowSnapshot(true);
  };

  const dismissSnapshot = () => {
    // Record that we've shown it
    const now = DateTime.now().toISO();
    localStorage.setItem(SNAPSHOT_KEY, now);
    setShowSnapshot(false);
  };

  return {
    showSnapshot,
    dismissSnapshot,
  };
}
