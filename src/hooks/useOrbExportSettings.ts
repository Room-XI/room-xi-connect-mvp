import { useState, useEffect } from 'react';

interface OrbExportSettings {
  exportEnabled: boolean;
  privacyAcknowledged: boolean;
}

const STORAGE_KEY = 'moodOrbExportSettings';

export function useOrbExportSettings() {
  const [settings, setSettings] = useState<OrbExportSettings>({
    exportEnabled: false,
    privacyAcknowledged: false,
  });
  
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse orb export settings:', error);
      }
    }
  }, []);
  
  const updateSettings = (newSettings: Partial<OrbExportSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };
  
  const enableExport = (acknowledged: boolean = true) => {
    updateSettings({ exportEnabled: true, privacyAcknowledged: acknowledged });
  };
  
  const disableExport = () => {
    updateSettings({ exportEnabled: false });
  };
  
  return {
    settings,
    enableExport,
    disableExport,
  };
}
