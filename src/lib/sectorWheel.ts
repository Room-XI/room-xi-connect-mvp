import { getMoodByKey, type MoodKey } from './moodConfig';

export interface MoodSector {
  mood: MoodKey;
  ratio: number;
  startAngle: number;
  endAngle: number;
  alpha: number;
}

export interface SectorWheelBlend {
  gradient: string;
  glow: string;
  particles: string;
  sectors: MoodSector[];
  dominantMood: MoodKey;
}

const EPSILON = 0.05;
const FEATHER_DEGREES = 8;

export function generateSectorWheel(
  ratios: Record<MoodKey, number>
): SectorWheelBlend {
  const moodKeys: MoodKey[] = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'];
  
  const baseRatios: Record<MoodKey, number> = {} as Record<MoodKey, number>;
  moodKeys.forEach(mood => {
    baseRatios[mood] = (ratios[mood] || 0) + EPSILON;
  });
  
  const total = Object.values(baseRatios).reduce((sum, val) => sum + val, 0);
  
  const normalizedRatios: Record<MoodKey, number> = {} as Record<MoodKey, number>;
  moodKeys.forEach(mood => {
    normalizedRatios[mood] = baseRatios[mood] / total;
  });
  
  let currentAngle = 0;
  const sectors: MoodSector[] = moodKeys.map(mood => {
    const span = 360 * normalizedRatios[mood];
    const rawRatio = ratios[mood] || 0;
    const alpha = Math.min(Math.max(0.25 + 0.65 * rawRatio, 0.05), 1);
    const sector: MoodSector = {
      mood,
      ratio: rawRatio,
      startAngle: currentAngle,
      endAngle: currentAngle + span,
      alpha,
    };
    currentAngle += span;
    return sector;
  });
  
  const dominantMood = moodKeys.reduce((a, b) => 
    (ratios[a] || 0) > (ratios[b] || 0) ? a : b
  );
  
  const gradient = createSectorGradient(sectors);
  
  const dominantColor = getMoodByKey(dominantMood).color;
  const glow = `hsla(${dominantColor.h}, ${dominantColor.s}%, ${dominantColor.l}%, 0.4)`;
  const particles = `hsl(${dominantColor.h}, ${dominantColor.s}%, ${Math.min(dominantColor.l + 15, 95)}%)`;
  
  return {
    gradient,
    glow,
    particles,
    sectors,
    dominantMood,
  };
}

function createSectorGradient(sectors: MoodSector[]): string {
  const stops: string[] = [];
  
  sectors.forEach((sector, index) => {
    const mood = getMoodByKey(sector.mood);
    const { h, s, l } = mood.color;
    const alpha = sector.alpha;
    
    const nextSector = sectors[(index + 1) % sectors.length];
    const nextMood = getMoodByKey(nextSector.mood);
    
    const featherStart = sector.endAngle - FEATHER_DEGREES / 2;
    const featherEnd = sector.endAngle + FEATHER_DEGREES / 2;
    
    const baseColor = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
    const darkerColor = `hsla(${h}, ${s}%, ${Math.max(l - 20, 10)}%, ${alpha})`;
    const nextColor = `hsla(${nextMood.color.h}, ${nextMood.color.s}%, ${nextMood.color.l}%, ${nextSector.alpha})`;
    
    stops.push(`${baseColor} ${sector.startAngle}deg`);
    stops.push(`${darkerColor} ${Math.min(featherStart, sector.endAngle)}deg`);
    stops.push(`${nextColor} ${featherEnd}deg`);
  });
  
  const firstMood = getMoodByKey(sectors[0].mood);
  const firstColor = `hsla(${firstMood.color.h}, ${firstMood.color.s}%, ${firstMood.color.l}%, ${sectors[0].alpha})`;
  stops.push(`${firstColor} 360deg`);
  
  return `conic-gradient(from 0deg at 50% 50%, ${stops.join(', ')})`;
}

export function calculateMoodIndices(
  checkIns: Array<{ mood: number; checkinDate: string }>
): {
  variabilityIndex: number;
  consistencyIndex: number;
  daysCheckedIn: number;
} {
  if (checkIns.length === 0) {
    return { variabilityIndex: 0, consistencyIndex: 0, daysCheckedIn: 0 };
  }
  
  const uniqueDays = new Set(checkIns.map(c => c.checkinDate));
  const daysCheckedIn = uniqueDays.size;
  
  const moodScores = checkIns.map(c => c.mood);
  const mean = moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length;
  const squaredDiffs = moodScores.map(score => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / moodScores.length;
  const stdDev = Math.sqrt(variance);
  
  const variabilityIndex = parseFloat(stdDev.toFixed(2));
  
  const consistencyIndex = daysCheckedIn / 7;
  
  return {
    variabilityIndex,
    consistencyIndex: parseFloat(consistencyIndex.toFixed(2)),
    daysCheckedIn,
  };
}
