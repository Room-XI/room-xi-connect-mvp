import { useState, useEffect } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import { useOrbExportSettings } from '@/hooks/useOrbExportSettings';

interface OrbExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
}

export function OrbExportModal({ isOpen, onClose, onConfirmExport }: OrbExportModalProps) {
  const { settings, enableExport } = useOrbExportSettings();
  const [acknowledged, setAcknowledged] = useState(settings.privacyAcknowledged);
  
  useEffect(() => {
    setAcknowledged(settings.privacyAcknowledged);
  }, [settings.privacyAcknowledged]);
  
  if (!isOpen) return null;
  
  const handleEnableAndExport = () => {
    if (acknowledged) {
      enableExport(true);
      onConfirmExport();
      onClose();
    }
  };
  
  const handleConfirmExport = () => {
    onConfirmExport();
    onClose();
  };
  
  if (!settings.exportEnabled) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Privacy Notice: Mood Orb Export</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <p>Before enabling mood orb exports, please understand:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><strong>Device-only saves:</strong> Images are saved directly to your device, not to any cloud service</li>
                  <li><strong>Your responsibility:</strong> Once downloaded, you control where these images are stored and shared</li>
                  <li><strong>Sensitive data:</strong> Mood orbs may reveal personal emotional patterns</li>
                  <li><strong>No organization tracking:</strong> Exports are not tracked or monitored by Room XI Connect</li>
                </ul>
                <p className="font-medium mt-3">Only enable this feature if you have a private, secure device.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-2 mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <input
              type="checkbox"
              id="privacy-acknowledge"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="privacy-acknowledge" className="text-sm cursor-pointer">
              I understand that exported images will be saved to my device only, and I am responsible for their security and privacy.
            </label>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEnableAndExport}
              disabled={!acknowledged}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Enable & Export
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <Download className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Export Mood Orb</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Export this week's mood orb as PNG?
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmExport}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
