/**
 * Reusable export button for mood orb
 * Captures orb as PNG image
 */

import { Download, Loader2 } from 'lucide-react';
import { useOrbExport } from '@/hooks/useOrbExport';

interface OrbExportButtonProps {
  orbElementRef: React.RefObject<HTMLElement>;
  className?: string;
}

export default function OrbExportButton({ orbElementRef, className = '' }: OrbExportButtonProps) {
  const { exporting, error, exportOrb, clearError } = useOrbExport();

  const handleExport = async () => {
    if (!orbElementRef.current) {
      console.error('Orb element not found');
      return;
    }

    await exportOrb(orbElementRef.current, 'png');
  };

  return (
    <div className={className}>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
        aria-label="Export mood orb as image"
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Export Orb</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          <p>{error}</p>
          <button 
            onClick={clearError}
            className="text-xs underline mt-1 hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
