import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { calculateMoodDistribution, generateMoodBlend, type MoodBlend } from '@/lib/moodGradient';

export interface MoodCheckIn {
  id: string;
  mood: number;
  timestamp: string;
  checkinDate: string;
}

export function useMoodGradient() {
  const [moodBlend, setMoodBlend] = useState<MoodBlend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<MoodCheckIn[]>([]);

  const fetchMoodData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: apiError } = await api.checkins.getLast7Days();
      
      if (apiError) {
        throw new Error(apiError);
      }
      
      if (data && Array.isArray(data)) {
        setCheckIns(data);
        
        // Calculate mood distribution
        const distribution = calculateMoodDistribution(data);
        
        // Generate blend styling
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
  }, []);

  return {
    moodBlend,
    checkIns,
    loading,
    error,
    refetch: fetchMoodData,
  };
}
