import { getMoodByScore, type MoodKey } from './moodConfig';
import { generateSectorWheel, type MoodSector } from './sectorWheel';

export interface MoodDistribution {
  [key: string]: number; // mood label -> count
}

export interface MoodBlend {
  gradient: string;
  glow: string;
  particles: string;
  distribution: MoodDistribution;
  sectors?: MoodSector[];
  dominantMood?: MoodKey;
}

/**
 * Generate mood orb styling from 7-day check-in ratios using sector wheel
 * @param ratios Map of mood keys to their ratios (0-1)
 * @returns Styling object with gradient, glow, particles, and sector data
 */
export function generateMoodBlend(ratios: Record<string, number>): MoodBlend {
  const moodKeys: MoodKey[] = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'];
  
  const hasData = Object.values(ratios).some(r => r > 0);
  
  if (!hasData) {
    return {
      gradient: 'radial-gradient(circle at 30% 30%, #147A4D, #6E8F7A, #D8AE3D)',
      glow: 'rgba(20, 122, 77, 0.4)',
      particles: '#147A4D',
      distribution: {},
    };
  }
  
  const moodRatios: Record<MoodKey, number> = {} as Record<MoodKey, number>;
  moodKeys.forEach(mood => {
    moodRatios[mood] = ratios[mood] || 0;
  });
  
  const sectorWheel = generateSectorWheel(moodRatios);
  
  const distribution: MoodDistribution = {};
  Object.entries(moodRatios).forEach(([mood, ratio]) => {
    distribution[mood] = ratio * 100;
  });
  
  return {
    gradient: sectorWheel.gradient,
    glow: sectorWheel.glow,
    particles: sectorWheel.particles,
    distribution,
    sectors: sectorWheel.sectors,
    dominantMood: sectorWheel.dominantMood,
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
