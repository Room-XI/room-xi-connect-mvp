/**
 * Hook for fetching historical mood data for specific date ranges
 * Used by MoodTimelapse to show past 7-day orb states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DateTime } from 'luxon';
import api from '@/lib/api';
import type { MoodSummary } from './useMoodGradient';

interface UseHistoricalMoodDataOptions {
  dayOffset: number; // 0 = today, 1 = yesterday, etc.
  enabled?: boolean;
}

interface HistoricalMoodData {
  summary: MoodSummary | null;
  loading: boolean;
  error: string | null;
}

// Cache to avoid redundant API calls
const cache = new Map<string, MoodSummary>();

export function useHistoricalMoodData({ 
  dayOffset, 
  enabled = true 
}: UseHistoricalMoodDataOptions): HistoricalMoodData {
  const [summary, setSummary] = useState<MoodSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (offset: number) => {
    const now = DateTime.now().setZone('America/Edmonton');
    
    // Calculate 7-day window ending on the target date
    const endDate = now.minus({ days: offset });
    const startDate = endDate.minus({ days: 6 });
    
    const cacheKey = `${startDate.toISODate()}_${endDate.toISODate()}`;
    
    // Check cache first
    if (cache.has(cacheKey)) {
      setSummary(cache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startISO = startDate.toISODate();
      const endISO = endDate.toISODate();
      
      if (!startISO || !endISO) {
        throw new Error('Invalid date range');
      }

      const { data, error: apiError } = await api.checkins.getSummaryRange(startISO, endISO);
      
      if (apiError) {
        setError(apiError);
        setSummary(null);
      } else if (data) {
        cache.set(cacheKey, data);
        setSummary(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Debounce rapid offset changes (e.g., scrubber dragging)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchData(dayOffset);
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [dayOffset, enabled, fetchData]);

  return { summary, loading, error };
}
