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
        
        // Convert ratios to distribution format for generateMoodBlend
        // Distribution needs counts, so multiply ratios by a common denominator
        const distribution: { [key: string]: number } = {};
        (Object.entries(data.ratios) as [string, number][]).forEach(([mood, ratio]) => {
          distribution[mood] = ratio * 100; // Scale up for blend calculation
        });
        
        // Generate blend styling from ratios
        const blend = generateMoodBlend(distribution);
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
