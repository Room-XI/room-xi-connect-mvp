import { MOODS, type MoodKey, getMoodByScore } from './moodConfig';

export interface MoodDistribution {
  [key: string]: number; // mood label -> count
}

export interface MoodBlend {
  gradient: string;
  glow: string;
  particles: string;
  distribution: MoodDistribution;
}

/**
 * Calculate weighted color blend from mood distribution
 * @param distribution Map of mood labels to their counts
 * @param total Total number of check-ins
 * @returns Blended HSL color values
 */
function calculateWeightedColor(distribution: MoodDistribution, total: number): { h: number; s: number; l: number } {
  let h = 0, s = 0, l = 0;
  
  Object.entries(distribution).forEach(([label, count]) => {
    const mood = MOODS.find(m => m.label === label);
    if (mood) {
      const weight = count / total;
      h += mood.color.h * weight;
      s += mood.color.s * weight;
      l += mood.color.l * weight;
    }
  });
  
  return { 
    h: Math.round(h), 
    s: Math.round(s), 
    l: Math.round(l) 
  };
}

/**
 * Create a radial gradient with multiple mood colors based on their frequency
 * @param distribution Map of mood labels to their counts
 * @returns CSS gradient string with all mood colors blended
 */
function createMultiColorGradient(distribution: MoodDistribution): string {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    // Default cosmic gradient when no check-ins
    return 'radial-gradient(circle at 30% 30%, #2EC489, #6E8F7A, #D8AE3D)';
  }
  
  // Sort moods by count (descending)
  const sortedMoods = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)
    .map(([label]) => MOODS.find(m => m.label === label))
    .filter(Boolean);
  
  if (sortedMoods.length === 0) {
    return 'radial-gradient(circle at 30% 30%, #2EC489, #6E8F7A, #D8AE3D)';
  }
  
  // Create gradient stops based on frequency
  const gradientStops: string[] = [];
  let position = 0;
  
  sortedMoods.forEach((mood, index) => {
    if (!mood) return;
    
    const count = distribution[mood.label] || 0;
    const percentage = (count / total) * 100;
    
    const { h, s, l } = mood.color;
    const baseColor = `hsl(${h}, ${s}%, ${l}%)`;
    const darkerColor = `hsl(${h}, ${s}%, ${Math.max(l - 20, 10)}%)`;
    
    // Add color stops with smooth transitions
    if (index === 0) {
      gradientStops.push(`${baseColor} 0%`);
      gradientStops.push(`${darkerColor} ${Math.min(percentage, 50)}%`);
    } else {
      const startPos = position;
      const endPos = Math.min(position + percentage, 100);
      gradientStops.push(`${baseColor} ${startPos}%`);
      gradientStops.push(`${darkerColor} ${endPos}%`);
    }
    
    position += percentage;
  });
  
  return `radial-gradient(circle at 30% 30%, ${gradientStops.join(', ')})`;
}

/**
 * Generate mood orb styling from 7-day check-in distribution
 * @param distribution Map of mood labels to their frequency counts
 * @returns Styling object with gradient, glow, and particles
 */
export function generateMoodBlend(distribution: MoodDistribution): MoodBlend {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) {
    // Default when no check-ins
    return {
      gradient: 'radial-gradient(circle at 30% 30%, #2EC489, #6E8F7A, #D8AE3D)',
      glow: 'rgba(46, 196, 137, 0.4)',
      particles: '#2EC489',
      distribution: {},
    };
  }
  
  // Calculate weighted average color for glow and particles
  const avgColor = calculateWeightedColor(distribution, total);
  const glowColor = `hsl(${avgColor.h}, ${avgColor.s}%, ${avgColor.l}%, 0.4)`;
  const particleColor = `hsl(${avgColor.h}, ${avgColor.s}%, ${Math.min(avgColor.l + 15, 95)}%)`;
  
  // Create multi-color gradient
  const gradient = createMultiColorGradient(distribution);
  
  return {
    gradient,
    glow: glowColor,
    particles: particleColor,
    distribution,
  };
}

/**
 * Convert check-in mood scores to a distribution map
 * @param checkIns Array of check-in objects with mood field
 * @returns Distribution map of mood labels to counts
 */
export function calculateMoodDistribution(checkIns: Array<{ mood: number }>): MoodDistribution {
  const distribution: MoodDistribution = {};
  
  checkIns.forEach(checkin => {
    const mood = getMoodByScore(checkin.mood);
    if (mood) {
      distribution[mood.label] = (distribution[mood.label] || 0) + 1;
    }
  });
  
  return distribution;
}
