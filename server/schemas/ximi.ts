import { z } from 'zod';

const moodTypes = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'] as const;
const wellnessDimensions = ['emotional', 'physical', 'social', 'intellectual', 'occupational', 'spiritual', 'environmental', 'financial'] as const;

export const ximiChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  checkinId: z.string().uuid().optional(),
  moodType: z.enum(moodTypes).optional(),
  wellnessDimensions: z.array(z.enum(wellnessDimensions)).optional(),
});

export const ximiModeSchema = z.object({
  mode: z.enum(['sibling', 'peer']),
});

export const ximiConsentSchema = z.object({
  consent: z.boolean(),
});

export const ximiRecommendationsSchema = z.object({
  currentMood: z.string().optional(),
  wellnessDimensions: z.array(z.string()).optional(),
  includeTrends: z.boolean().optional(),
  userLat: z.number().min(-90).max(90).optional(),
  userLng: z.number().min(-180).max(180).optional(),
  prioritizeNearby: z.boolean().optional(),
});
