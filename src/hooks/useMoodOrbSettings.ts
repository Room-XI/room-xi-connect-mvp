/**
 * Hook to manage mood orb accessibility settings
 * Fetches settings from user profile and provides update functions
 */

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/session';
import api from '@/lib/api';

export interface MoodOrbSettings {
  highVisibility: boolean;
  patternOverlay: boolean;
  showColorKey: boolean;
}

const defaultSettings: MoodOrbSettings = {
  highVisibility: false,
  patternOverlay: false,
  showColorKey: false,
};

export function useMoodOrbSettings() {
  const { user, loading: sessionLoading } = useSession();
  const [settings, setSettings] = useState<MoodOrbSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings from user profile
  const fetchSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: apiError } = await api.profile.get();
      
      if (apiError) {
        throw new Error(apiError);
      }
      
      if (data) {
        setSettings({
          highVisibility: data.highVisibility ?? false,
          patternOverlay: data.patternOverlay ?? false,
          showColorKey: data.showColorKey ?? false,
        });
      }
    } catch (err) {
      console.error('Error fetching mood orb settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Update a single setting
  const updateSetting = async (key: keyof MoodOrbSettings, value: boolean) => {
    if (!user) {
      setError('Must be logged in to update settings');
      return;
    }

    try {
      const { error: apiError } = await api.profile.update({ [key]: value });
      
      if (apiError) {
        throw new Error(apiError);
      }
      
      // Optimistically update local state
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error(`Error updating ${key}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      // Revert to server state on error
      await fetchSettings();
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      fetchSettings();
    }
  }, [user, sessionLoading]);

  return {
    settings,
    loading: sessionLoading || loading,
    error,
    updateSetting,
    refetch: fetchSettings,
  };
}
