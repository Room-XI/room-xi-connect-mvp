/**
 * Orb Export Utilities
 * Generate PNG exports of mood orb
 */

export type ExportFormat = 'png';

interface ExportOptions {
  format: ExportFormat;
}

/**
 * Export mood orb as static PNG image
 */
export async function exportOrbAnimation(
  canvasElement: HTMLCanvasElement,
  options: ExportOptions
): Promise<void> {
  const { format } = options;

  if (format === 'png') {
    return exportOrbAsPNG(canvasElement);
  }

  throw new Error('Unsupported export format');
}

/**
 * Export mood orb as static PNG image
 */
export async function exportOrbAsPNG(canvasElement: HTMLCanvasElement): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      canvasElement.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create image'));
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mood-orb-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
        
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Check if export format is supported in current browser
 */
export function isExportSupported(format: ExportFormat): boolean {
  if (typeof HTMLCanvasElement === 'undefined') return false;
  
  if (format === 'png') {
    return typeof Blob !== 'undefined';
  }
  
  return false;
}

/**
 * Get recommended export format based on browser capabilities
 */
export function getRecommendedFormat(): ExportFormat {
  return 'png';
}
