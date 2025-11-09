/**
 * Orb Export Utilities
 * Generate static image export of mood orb (simplified version)
 */

import { MoodBlend } from './moodGradient';

/**
 * Export mood orb as PNG image
 * Captures current orb state and downloads as image file
 */
export async function exportOrbAsPNG(moodBlend: MoodBlend | null): Promise<void> {
  if (!moodBlend) {
    throw new Error('No mood data to export');
  }

  try {
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const size = 400;
    canvas.width = size;
    canvas.height = size;

    // Draw gradient background (simplified)
    const gradient = ctx.createRadialGradient(size / 3, size / 3, 0, size / 2, size / 2, size / 2);
    
    // Parse colors from moodBlend.gradient (simplified to single color for now)
    gradient.addColorStop(0, '#2EC489');
    gradient.addColorStop(1, '#374151');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('Failed to create image');
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mood-orb-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      
      URL.revokeObjectURL(url);
    }, 'image/png');
    
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Check if export is supported in current browser
 */
export function isExportSupported(): boolean {
  return typeof HTMLCanvasElement !== 'undefined' && typeof Blob !== 'undefined';
}
