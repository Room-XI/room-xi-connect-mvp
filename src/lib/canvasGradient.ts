/**
 * Canvas-based smooth gradient rendering for mood orb
 * Creates continuous color blends with soft atmospheric quality
 */

import { getMoodByKey, type MoodKey } from './moodConfig';

export interface CanvasGradientOptions {
  ratios: Record<MoodKey, number>;
  size: number;
  blurRadius?: number; // Gaussian blur intensity (0-50)
  minColorWeight?: number; // Minimum visibility for each color (0-0.2)
  highContrast?: boolean;
  showPatterns?: boolean;
}

interface ColorStop {
  angle: number; // Radians
  hue: number;
  saturation: number;
  lightness: number;
  weight: number; // 0-1
}

const EPSILON = 0.05; // Minimum visibility for all 6 moods

/**
 * Convert HSL to RGB for canvas rendering
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
}

/**
 * Calculate weighted color stops distributed around the circle
 * Ensures all 6 moods are always visible using EPSILON weighting
 */
export function calculateColorStops(ratios: Record<MoodKey, number>): ColorStop[] {
  const moodKeys: MoodKey[] = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'];
  
  // Apply epsilon to ensure all moods visible
  const weightedRatios: Record<MoodKey, number> = {} as Record<MoodKey, number>;
  moodKeys.forEach(mood => {
    weightedRatios[mood] = (ratios[mood] || 0) + EPSILON;
  });
  
  // Normalize to sum to 1
  const total = Object.values(weightedRatios).reduce((sum, val) => sum + val, 0);
  const normalizedRatios: Record<MoodKey, number> = {} as Record<MoodKey, number>;
  moodKeys.forEach(mood => {
    normalizedRatios[mood] = weightedRatios[mood] / total;
  });
  
  // Distribute colors around circle based on ratios
  let currentAngle = 0;
  const stops: ColorStop[] = moodKeys.map(mood => {
    const moodConfig = getMoodByKey(mood);
    const { h, s, l } = moodConfig.color;
    const weight = normalizedRatios[mood];
    
    // Calculate angle span for this mood (in radians)
    const span = 2 * Math.PI * weight;
    const centerAngle = currentAngle + span / 2;
    
    currentAngle += span;
    
    return {
      angle: centerAngle,
      hue: h,
      saturation: s,
      lightness: l,
      weight,
    };
  });
  
  return stops;
}

/**
 * Render smooth gradient onto canvas using radial interpolation
 * Creates dreamy atmospheric blend with all 6 moods visible
 * Handles HiDPI/retina displays correctly
 */
export function renderSmoothGradient(
  ctx: CanvasRenderingContext2D,
  options: CanvasGradientOptions
): void {
  const { ratios, size, blurRadius = 20, highContrast = false } = options;
  
  // Get device pixel ratio for crisp rendering on retina displays
  const dpr = window.devicePixelRatio || 1;
  const renderSize = Math.floor(size * dpr);
  const centerX = renderSize / 2;
  const centerY = renderSize / 2;
  const radius = renderSize / 2;
  
  // Calculate color stops
  const colorStops = calculateColorStops(ratios);
  
  // Create image data at device pixel resolution
  const imageData = ctx.createImageData(renderSize, renderSize);
  const data = imageData.data;
  
  // Render each pixel with interpolated color
  for (let y = 0; y < renderSize; y++) {
    for (let x = 0; x < renderSize; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Skip pixels outside circle
      if (distance > radius) {
        const pixelIndex = (y * renderSize + x) * 4;
        data[pixelIndex + 3] = 0; // Transparent
        continue;
      }
      
      // Calculate angle for this pixel (radians)
      const angle = Math.atan2(dy, dx) + Math.PI; // 0 to 2π
      
      // Interpolate color from nearby stops
      const color = interpolateColor(angle, distance, radius, colorStops, highContrast);
      
      // Write pixel data
      const pixelIndex = (y * renderSize + x) * 4;
      data[pixelIndex] = color[0]; // R
      data[pixelIndex + 1] = color[1]; // G
      data[pixelIndex + 2] = color[2]; // B
      data[pixelIndex + 3] = 255; // A (opaque inside circle)
    }
  }
  
  // Reset transform before putImageData (putImageData ignores transforms)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  // Draw to canvas
  ctx.putImageData(imageData, 0, 0);
  
  // Apply Gaussian blur for dreamy effect (blur amount scales with dpr)
  if (blurRadius > 0) {
    ctx.filter = `blur(${blurRadius * dpr}px)`;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';
  }
  
  // Restore transform for subsequent drawing operations
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Interpolate color at given angle using weighted contribution from all stops
 * Uses HSL interpolation with circular hue averaging to avoid muddy colors
 */
function interpolateColor(
  angle: number,
  distance: number,
  radius: number,
  stops: ColorStop[],
  highContrast: boolean
): [number, number, number] {
  let totalSinH = 0; // For circular hue averaging
  let totalCosH = 0;
  let totalS = 0;
  let totalL = 0;
  let totalWeight = 0;
  
  // Distance-based blending: center blends ALL colors equally, edges use angular weighting
  const distanceRatio = distance / radius;
  
  // Smooth transition from center (uniform) to edge (angular) using smoothstep
  // This eliminates discontinuities and creates seamless center blend
  const smoothstep = (t: number) => t * t * (3 - 2 * t);
  const angularInfluence = smoothstep(Math.pow(distanceRatio, 0.8));
  
  // Calculate contribution from each color stop
  stops.forEach(stop => {
    // Angular distance (handle wrap-around)
    let angleDiff = Math.abs(angle - stop.angle);
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }
    
    // Wide Gaussian spread for dreamy blends
    const sigma = Math.PI / 2;
    const angularWeight = Math.exp(-(angleDiff * angleDiff) / (2 * sigma * sigma));
    
    // Smoothly interpolate: center uses uniform weight (1), edges use angular weight
    // No discontinuities - continuous smooth transition
    const blendWeight = (1 - angularInfluence) + angularInfluence * angularWeight;
    const weight = stop.weight * blendWeight;
    
    // Convert hue to radians and use circular averaging (unit vectors)
    const hueRad = (stop.hue * Math.PI) / 180;
    totalSinH += Math.sin(hueRad) * weight;
    totalCosH += Math.cos(hueRad) * weight;
    
    totalS += stop.saturation * weight;
    totalL += stop.lightness * weight;
    totalWeight += weight;
  });
  
  // Circular hue average using atan2 (handles 0°/360° wrap correctly)
  const hueRad = Math.atan2(totalSinH / totalWeight, totalCosH / totalWeight);
  const h = ((hueRad * 180) / Math.PI + 360) % 360; // Convert back to degrees, ensure positive
  
  // Soften colors for pastel dreamy aesthetic
  // Reduce saturation by 25% and increase lightness by 10%
  let s = (totalS / totalWeight) * 0.75; // Softer, less vibrant
  let l = Math.min((totalL / totalWeight) + 10, 90); // Lighter, more pastel
  
  // Enhanced radial gradient: smoother fade from center to edge for depth
  const radialFactor = 1 + (1 - distance / radius) * 0.15; // Lighter center
  l = Math.min(l * radialFactor, 95);
  
  // High contrast mode (override soft colors for accessibility)
  if (highContrast) {
    return hslToRgb(h, s + 30, Math.min(l + 10, 90));
  }
  
  return hslToRgb(h, s, l);
}

/**
 * Draw pattern overlay for accessibility
 * Expects context already scaled by DPR
 */
export function drawPatternOverlay(
  ctx: CanvasRenderingContext2D,
  size: number,
  stops: ColorStop[]
): void {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;
  
  ctx.save();
  
  // Create circular clip
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.clip();
  
  // Draw concentric rings for each mood zone
  stops.forEach((stop) => {
    const startAngle = stop.angle - (Math.PI / 6);
    const endAngle = stop.angle + (Math.PI / 6);
    
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + stop.weight * 0.3})`;
    ctx.lineWidth = 2;
    
    // Radial lines
    for (let r = radius * 0.3; r < radius; r += 15) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, startAngle, endAngle);
      ctx.stroke();
    }
  });
  
  ctx.restore();
}

/**
 * Get dominant mood color for glow effects
 */
export function getDominantMoodColor(ratios: Record<MoodKey, number>): {
  h: number;
  s: number;
  l: number;
  mood: MoodKey;
} {
  const moodKeys: MoodKey[] = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'];
  
  const dominantMood = moodKeys.reduce((a, b) => 
    (ratios[a] || 0) > (ratios[b] || 0) ? a : b
  );
  
  const moodConfig = getMoodByKey(dominantMood);
  return {
    h: moodConfig.color.h,
    s: moodConfig.color.s,
    l: moodConfig.color.l,
    mood: dominantMood,
  };
}
