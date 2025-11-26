import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useSession } from '@/lib/session';
import { generateMoodBlend, type MoodBlend } from '@/lib/moodGradient';
import { logger } from '@/lib/logger';

export interface MoodSummary {
  ratios: {
    cold: number;
    stormy: number;
    foggy: number;
    clear: number;
    breezy: number;
    aurora: number;
  };
  variance: number;
  variabilityIndex: number;
  consistencyIndex: number;
  streak7: number;
  dominant: string;
  daysWithData: number;
}

export function useMoodGradient(window: number = 7) {
  const { user, loading: sessionLoading } = useSession();
  const [moodBlend, setMoodBlend] = useState<MoodBlend | null>(null);
  const [summary, setSummary] = useState<MoodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMoodData = async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: apiError } = await api.checkins.getSummary(window);
      
      if (apiError) {
        throw new Error(apiError);
      }
      
      if (data) {
        setSummary(data);
        
        // Pass ratios directly (0-1 values) for sector wheel alpha calculation
        const blend = generateMoodBlend(data.ratios);
        setMoodBlend(blend);
      }
    } catch (err) {
      logger.debug('Mood gradient fetch skipped or failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mood data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch when session loading is complete and user is authenticated
    if (!sessionLoading) {
      if (user) {
        fetchMoodData();
      } else {
        setLoading(false);
      }
    }
  }, [window, user, sessionLoading]);

  return {
    moodBlend,
    summary,
    loading: loading || sessionLoading,
    error,
    refetch: fetchMoodData,
  };
}
