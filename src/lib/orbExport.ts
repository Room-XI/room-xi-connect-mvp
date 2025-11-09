/**
 * Orb Export Utilities
 * Generate GIF/MP4/PNG exports of mood orb animation
 * Uses canvas-record for efficient encoding
 */

import { Recorder, RecorderStatus, Encoders } from 'canvas-record';
import type { MoodBlend } from './moodGradient';

export type ExportFormat = 'gif' | 'mp4' | 'png';

interface ExportOptions {
  format: ExportFormat;
  duration?: number; // seconds (for gif/mp4)
  frameRate?: number; // fps
  quality?: number; // 0-100
}

/**
 * Export mood orb as animated GIF or MP4
 * Captures the orb's gradient animation over time
 */
export async function exportOrbAnimation(
  canvasElement: HTMLCanvasElement,
  options: ExportOptions
): Promise<void> {
  const { format, duration = 5, frameRate = 30, quality = 90 } = options;

  if (format === 'png') {
    return exportOrbAsPNG(canvasElement);
  }

  try {
    const ctx = canvasElement.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Choose encoder based on format
    const encoder = format === 'gif' 
      ? Encoders.GIFEncoder
      : Encoders.H264MP4Encoder;

    const recorder = new Recorder(ctx, {
      name: `mood-orb-${new Date().toISOString().split('T')[0]}`,
      encoderOptions: {
        codec: encoder.codec,
        quality: quality / 100,
      },
      frameRate,
      duration,
    });

    // Start recording
    await recorder.start();

    // Capture frames (canvas-record handles this automatically)
    // The existing animation loop will be captured
    const totalFrames = duration * frameRate;
    const frameInterval = 1000 / frameRate;

    return new Promise((resolve, reject) => {
      let frameCount = 0;
      const captureInterval = setInterval(() => {
        if (recorder.status === RecorderStatus.Recording) {
          recorder.step(); // Capture current frame
          frameCount++;

          if (frameCount >= totalFrames) {
            clearInterval(captureInterval);
            recorder.stop()
              .then(() => {
                console.log(`✅ Exported ${format.toUpperCase()} successfully`);
                resolve();
              })
              .catch(reject);
          }
        }
      }, frameInterval);

      // Timeout safeguard
      setTimeout(() => {
        clearInterval(captureInterval);
        reject(new Error('Export timeout'));
      }, (duration + 5) * 1000);
    });
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Export mood orb as static PNG image
 */
export async function exportOrbAsPNG(canvasElement: HTMLCanvasElement): Promise<void> {
  try {
    canvasElement.toBlob((blob) => {
      if (!blob) throw new Error('Failed to create image');
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mood-orb-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('PNG export failed:', error);
    throw error;
  }
}

/**
 * Check if export format is supported in current browser
 */
export function isExportSupported(format: ExportFormat): boolean {
  if (typeof HTMLCanvasElement === 'undefined') return false;
  
  if (format === 'png') {
    return typeof Blob !== 'undefined';
  }
  
  // GIF and MP4 require WebCodecs API or ffmpeg.wasm fallback
  // canvas-record handles fallbacks automatically
  return true;
}

/**
 * Get recommended export format based on browser capabilities
 */
export function getRecommendedFormat(): ExportFormat {
  // Check for WebCodecs support (Chrome 94+, Firefox 130+)
  if (typeof VideoEncoder !== 'undefined') {
    return 'mp4'; // Best quality and smallest file size
  }
  
  // Fallback to GIF (universal support)
  return 'gif';
}
