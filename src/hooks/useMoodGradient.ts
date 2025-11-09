import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { generateMoodBlend, type MoodBlend } from '@/lib/moodGradient';

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
  const [moodBlend, setMoodBlend] = useState<MoodBlend | null>(null);
  const [summary, setSummary] = useState<MoodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMoodData = async () => {
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
      console.error('Error fetching mood gradient data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mood data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoodData();
  }, [window]);

  return {
    moodBlend,
    summary,
    loading,
    error,
    refetch: fetchMoodData,
  };
}
