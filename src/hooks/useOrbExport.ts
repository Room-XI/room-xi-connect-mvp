/**
 * Hook for exporting mood orb as image
 * Simplified to PNG export via DOM screenshot
 */

import { useState } from 'react';
import html2canvas from 'html2canvas';

export type ExportFormat = 'png';

interface UseOrbExportResult {
  exporting: boolean;
  error: string | null;
  exportOrb: (element: HTMLElement, format: ExportFormat) => Promise<void>;
  clearError: () => void;
}

export function useOrbExport(): UseOrbExportResult {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportOrb = async (element: HTMLElement, format: ExportFormat = 'png') => {
    if (exporting) return;
    
    setExporting(true);
    setError(null);

    try {
      // Capture DOM element as canvas
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Failed to create image');
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mood-orb-${new Date().toISOString().split('T')[0]}.${format}`;
        link.click();
        
        URL.revokeObjectURL(url);
      }, `image/${format}`);
      
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    exporting,
    error,
    exportOrb,
    clearError,
  };
}
