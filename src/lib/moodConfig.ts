import type { LucideIcon } from 'lucide-react';
import { Snowflake, CloudLightning, CloudFog, Sun, Zap, Sparkles } from 'lucide-react';

export type MoodKey = 'cold' | 'stormy' | 'foggy' | 'clear' | 'breezy' | 'aurora';

export interface MoodConfig {
  key: MoodKey;
  label: string;
  emoji: string;
  icon: LucideIcon;
  score: 1 | 2 | 3 | 4 | 5 | 6;
  desc: string;
  color: { h: number; s: number; l: number };
  copyHint: string;
}

export const MOODS: MoodConfig[] = [
  {
    key: 'cold',
    label: 'Cold',
    emoji: '❄️',
    icon: Snowflake,
    score: 1,
    desc: 'Numb, withdrawn, low energy',
    color: { h: 210, s: 40, l: 70 },
    copyHint: 'Feeling cold or numb?',
  },
  {
    key: 'stormy',
    label: 'Stormy',
    emoji: '⛈️',
    icon: CloudLightning,
    score: 2,
    desc: 'Overwhelmed, heavy feelings',
    color: { h: 250, s: 70, l: 40 },
    copyHint: 'Feeling heavy or overwhelmed?',
  },
  {
    key: 'foggy',
    label: 'Foggy',
    emoji: '🌫️',
    icon: CloudFog,
    score: 3,
    desc: 'Unclear, confused, meh',
    color: { h: 220, s: 10, l: 75 },
    copyHint: 'Feeling unclear or meh?',
  },
  {
    key: 'clear',
    label: 'Clear',
    emoji: '☀️',
    icon: Sun,
    score: 4,
    desc: 'Calm, stable, doing okay',
    color: { h: 48, s: 95, l: 55 },
    copyHint: 'Feeling calm and okay.',
  },
  {
    key: 'breezy',
    label: 'Breezy',
    emoji: '⚡',
    icon: Zap,
    score: 5,
    desc: 'Upbeat, energized, motivated',
    color: { h: 52, s: 98, l: 58 },
    copyHint: 'Feeling upbeat and energized!',
  },
  {
    key: 'aurora',
    label: 'Aurora',
    emoji: '🌌',
    icon: Sparkles,
    score: 6,
    desc: 'Amazing, glowing, best mood',
    color: { h: 285, s: 70, l: 60 },
    copyHint: 'Feeling amazing—glowing!',
  },
];

export const MOOD_MAP = MOODS.reduce((acc, mood) => {
  acc[mood.key] = mood;
  return acc;
}, {} as Record<MoodKey, MoodConfig>);

export function getMoodByKey(key: MoodKey): MoodConfig {
  return MOOD_MAP[key];
}

export function getMoodByScore(score: number): MoodConfig {
  return MOODS.find((m) => m.score === score) || MOODS[3];
}

export function getMoodColor(key: MoodKey): string {
  const mood = getMoodByKey(key);
  if (!mood) return 'hsl(48, 95%, 55%)';
  return `hsl(${mood.color.h}, ${mood.color.s}%, ${mood.color.l}%)`;
}

export function blendMoodColors(
  immediate: MoodKey,
  ambient: MoodKey,
  ratio: number = 0.3
): string {
  const immediateMood = getMoodByKey(immediate);
  const ambientMood = getMoodByKey(ambient);
  
  if (!immediateMood || !ambientMood) {
    return 'hsl(48, 95%, 55%)';
  }

  const h = immediateMood.color.h * ratio + ambientMood.color.h * (1 - ratio);
  const s = immediateMood.color.s * ratio + ambientMood.color.s * (1 - ratio);
  const l = immediateMood.color.l * ratio + ambientMood.color.l * (1 - ratio);

  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

// Export MOOD_COLORS for compatibility with OrbTimelapse
export const MOOD_COLORS = MOODS.reduce((acc, mood) => {
  acc[mood.label] = mood.color;
  return acc;
}, {} as Record<string, { h: number; s: number; l: number }>);
