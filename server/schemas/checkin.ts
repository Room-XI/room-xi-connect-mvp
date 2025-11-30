import { z } from 'zod';

const moodTypes = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'] as const;
const wellnessDimensions = ['emotional', 'physical', 'social', 'intellectual', 'occupational', 'spiritual', 'environmental', 'financial'] as const;

export const createCheckinSchema = z.object({
  timestamp: z.string().datetime().optional(),
  dimension: z.string().max(50).optional(),
  moodLevel16: z.number().int().min(1).max(16).optional(),
  moodType: z.enum(moodTypes).optional(),
  wellnessDimensions: z.array(z.enum(wellnessDimensions)).optional(),
  affectTags: z.array(z.string().max(50)).max(10).optional(),
  note: z.string().max(1000).optional(),
  localTz: z.string().max(100).optional(),
});
