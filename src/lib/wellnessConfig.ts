export type WellnessDimensionKey = 
  | 'emotional'
  | 'physical'
  | 'social'
  | 'spiritual'
  | 'intellectual'
  | 'environmental'
  | 'financial'
  | 'purpose';

export interface WellnessDimension {
  key: WellnessDimensionKey;
  label: string;
  emoji: string;
  description: string;
  examples: string[];
}

export const WELLNESS_DIMENSIONS: WellnessDimension[] = [
  {
    key: 'emotional',
    label: 'Emotional',
    emoji: '💭',
    description: 'Feelings, mood, emotional stability',
    examples: ['Stress', 'Happiness', 'Anxiety', 'Confidence'],
  },
  {
    key: 'physical',
    label: 'Physical',
    emoji: '💪',
    description: 'Energy, health, sleep, exercise',
    examples: ['Sleep quality', 'Energy levels', 'Pain', 'Fitness'],
  },
  {
    key: 'social',
    label: 'Social',
    emoji: '👥',
    description: 'Relationships, connection, loneliness',
    examples: ['Friendships', 'Family', 'Belonging', 'Support'],
  },
  {
    key: 'spiritual',
    label: 'Spiritual',
    emoji: '✨',
    description: 'Purpose, meaning, values, faith',
    examples: ['Beliefs', 'Values', 'Meaning', 'Connection'],
  },
  {
    key: 'intellectual',
    label: 'Intellectual',
    emoji: '🧠',
    description: 'Learning, creativity, focus, curiosity',
    examples: ['School', 'Creativity', 'Focus', 'Learning'],
  },
  {
    key: 'environmental',
    label: 'Environmental',
    emoji: '🏡',
    description: 'Home, safety, surroundings, comfort',
    examples: ['Home safety', 'Neighborhood', 'Comfort', 'Space'],
  },
  {
    key: 'financial',
    label: 'Financial',
    emoji: '💰',
    description: 'Money stress, stability, resources',
    examples: ['Money worries', 'Resources', 'Stability', 'Needs'],
  },
  {
    key: 'purpose',
    label: 'Purpose',
    emoji: '🎯',
    description: 'Goals, direction, motivation, future',
    examples: ['Goals', 'Direction', 'Motivation', 'Hope'],
  },
];

export const WELLNESS_MAP = WELLNESS_DIMENSIONS.reduce((acc, dim) => {
  acc[dim.key] = dim;
  return acc;
}, {} as Record<WellnessDimensionKey, WellnessDimension>);

export function getWellnessDimension(key: WellnessDimensionKey): WellnessDimension | undefined {
  return WELLNESS_MAP[key];
}
