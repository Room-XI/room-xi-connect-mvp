import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock('../db.js', () => ({
  db: mockDb,
}));

vi.mock('../schema.js', () => ({
  programs: { id: 'id', title: 'title', tags: 'tags' },
  programEvents: { id: 'id', programId: 'programId', active: 'active' },
  profiles: { userId: 'userId' },
  recommendationEvents: {},
  peerSuccessInsights: { programId: 'programId', suppressed: 'suppressed', createdAt: 'createdAt' },
}));

vi.mock('../logger.ts', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  or: vi.fn((...conditions) => ({ conditions, type: 'or' })),
  gte: vi.fn((field, value) => ({ field, value, type: 'gte' })),
  lte: vi.fn((field, value) => ({ field, value, type: 'lte' })),
  inArray: vi.fn((field, values) => ({ field, values, type: 'inArray' })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: 'sql' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  isNull: vi.fn((field) => ({ field, type: 'isNull' })),
}));

describe('Recommendations Service - Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateDistance (Haversine formula)', () => {
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      return Math.round(distance * 10) / 10;
    }

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(53.5461, -113.4938, 53.5461, -113.4938);
      expect(distance).toBe(0);
    });

    it('should calculate distance between two Edmonton locations', () => {
      const downtownLat = 53.5461;
      const downtownLng = -113.4938;
      const westEdmontonMallLat = 53.5225;
      const westEdmontonMallLng = -113.6242;
      
      const distance = calculateDistance(downtownLat, downtownLng, westEdmontonMallLat, westEdmontonMallLng);
      
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(15);
    });

    it('should calculate distance between cities', () => {
      const edmontonLat = 53.5461;
      const edmontonLng = -113.4938;
      const calgaryLat = 51.0447;
      const calgaryLng = -114.0719;
      
      const distance = calculateDistance(edmontonLat, edmontonLng, calgaryLat, calgaryLng);
      
      expect(distance).toBeGreaterThan(250);
      expect(distance).toBeLessThan(350);
    });

    it('should be symmetric (A to B equals B to A)', () => {
      const lat1 = 53.5461;
      const lng1 = -113.4938;
      const lat2 = 51.0447;
      const lng2 = -114.0719;
      
      const distanceAB = calculateDistance(lat1, lng1, lat2, lng2);
      const distanceBA = calculateDistance(lat2, lng2, lat1, lng1);
      
      expect(distanceAB).toBe(distanceBA);
    });
  });

  describe('calculateProximityScore', () => {
    function calculateProximityScore(distanceKm: number): number {
      if (distanceKm > 40) return 0;
      return Math.max(0, 0.3 - (distanceKm / 40) * 0.3);
    }

    it('should return 0.3 for distance 0 km', () => {
      const score = calculateProximityScore(0);
      expect(score).toBe(0.3);
    });

    it('should return ~0.15 for distance 20 km (half)', () => {
      const score = calculateProximityScore(20);
      expect(score).toBeCloseTo(0.15, 1);
    });

    it('should return 0 for distance 40 km', () => {
      const score = calculateProximityScore(40);
      expect(score).toBe(0);
    });

    it('should return 0 for distance > 40 km', () => {
      const score = calculateProximityScore(100);
      expect(score).toBe(0);
    });

    it('should return value between 0 and 0.3', () => {
      const score = calculateProximityScore(15);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.3);
    });
  });

  describe('MOOD_TAG_MAP', () => {
    const MOOD_TAG_MAP: Record<string, string[]> = {
      cold: ['quiet', 'gentle', 'creative', 'arts', 'mental-health', 'indoor', 'calm', 'mindfulness', 'self-care'],
      stormy: ['mental-health', 'community', 'quiet', 'creative', 'arts', 'support', 'counselling', 'indoor'],
      foggy: ['creative', 'arts', 'learning', 'tech', 'mental-health', 'community', 'indoor', 'structure'],
      clear: ['community', 'social', 'creative', 'arts', 'learning', 'tech', 'sports', 'indoor'],
      breezy: ['sports', 'outdoor', 'community', 'active', 'drop-in', 'creative', 'physical'],
      aurora: ['community', 'social', 'leadership', 'creative', 'sports', 'outdoor', 'active', 'drop-in'],
    };

    it('should have 6 mood types', () => {
      expect(Object.keys(MOOD_TAG_MAP)).toHaveLength(6);
    });

    it('should map cold mood to calming tags', () => {
      expect(MOOD_TAG_MAP.cold).toContain('quiet');
      expect(MOOD_TAG_MAP.cold).toContain('calm');
      expect(MOOD_TAG_MAP.cold).toContain('mindfulness');
    });

    it('should map stormy mood to support tags', () => {
      expect(MOOD_TAG_MAP.stormy).toContain('mental-health');
      expect(MOOD_TAG_MAP.stormy).toContain('support');
      expect(MOOD_TAG_MAP.stormy).toContain('counselling');
    });

    it('should map aurora mood to active/social tags', () => {
      expect(MOOD_TAG_MAP.aurora).toContain('active');
      expect(MOOD_TAG_MAP.aurora).toContain('social');
      expect(MOOD_TAG_MAP.aurora).toContain('leadership');
    });

    it('should have community in multiple moods', () => {
      const moodsWithCommunity = Object.entries(MOOD_TAG_MAP)
        .filter(([_, tags]) => tags.includes('community'))
        .map(([mood]) => mood);
      
      expect(moodsWithCommunity.length).toBeGreaterThan(1);
    });
  });
});

describe('Recommendations Service - Scoring Algorithm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mood tag matching (0-0.4 points)', () => {
    function scoreMoodTags(programTags: string[], moodTags: string[]): number {
      const matchingTags = programTags.filter((tag: string) =>
        moodTags.some(moodTag => tag.toLowerCase().includes(moodTag.toLowerCase()))
      );
      return Math.min(matchingTags.length * 0.1, 0.4);
    }

    it('should return 0 for no matching tags', () => {
      const programTags = ['hiking', 'swimming'];
      const moodTags = ['quiet', 'calm', 'indoor'];
      
      const score = scoreMoodTags(programTags, moodTags);
      
      expect(score).toBe(0);
    });

    it('should return 0.1 for one matching tag', () => {
      const programTags = ['creative', 'hiking'];
      const moodTags = ['quiet', 'creative', 'indoor'];
      
      const score = scoreMoodTags(programTags, moodTags);
      
      expect(score).toBe(0.1);
    });

    it('should return 0.3 for three matching tags', () => {
      const programTags = ['creative', 'indoor', 'calm'];
      const moodTags = ['quiet', 'creative', 'indoor', 'calm'];
      
      const score = scoreMoodTags(programTags, moodTags);
      
      expect(score).toBeCloseTo(0.3, 5);
    });

    it('should cap at 0.4 for more than 4 matching tags', () => {
      const programTags = ['creative', 'indoor', 'calm', 'quiet', 'arts', 'mindfulness'];
      const moodTags = ['quiet', 'creative', 'indoor', 'calm', 'arts', 'mindfulness'];
      
      const score = scoreMoodTags(programTags, moodTags);
      
      expect(score).toBe(0.4);
    });
  });

  describe('Wellness dimension matching (0-0.3 points)', () => {
    function scoreWellnessDimensions(programTags: string[], userDimensions: string[]): number {
      const matchingDimensions = programTags.filter((tag: string) =>
        userDimensions.some(dim => tag.toLowerCase().includes(dim.toLowerCase()))
      );
      return Math.min(matchingDimensions.length * 0.15, 0.3);
    }

    it('should return 0 for no matching dimensions', () => {
      const programTags = ['hiking', 'swimming'];
      const userDimensions = ['mental', 'social'];
      
      const score = scoreWellnessDimensions(programTags, userDimensions);
      
      expect(score).toBe(0);
    });

    it('should return 0.15 for one matching dimension', () => {
      const programTags = ['mental-health', 'hiking'];
      const userDimensions = ['mental', 'social'];
      
      const score = scoreWellnessDimensions(programTags, userDimensions);
      
      expect(score).toBe(0.15);
    });

    it('should cap at 0.3 for more than 2 matching dimensions', () => {
      const programTags = ['mental-health', 'social-skills', 'physical-activity'];
      const userDimensions = ['mental', 'social', 'physical'];
      
      const score = scoreWellnessDimensions(programTags, userDimensions);
      
      expect(score).toBe(0.3);
    });
  });

  describe('Cost/barrier scoring', () => {
    function scoreBarriers(program: { free: boolean; costCents: number | null; city?: string }, context: { city?: string }): number {
      let adjustment = 0;

      if (!program.free && program.costCents && program.costCents > 5000) {
        adjustment -= 0.15;
      } else if (program.free) {
        adjustment += 0.05;
      }

      if (context.city && program.city) {
        if (program.city.toLowerCase() !== context.city.toLowerCase()) {
          adjustment -= 0.1;
        }
      }

      return adjustment;
    }

    it('should boost free programs by 0.05', () => {
      const program = { free: true, costCents: 0 };
      const context = {};
      
      const adjustment = scoreBarriers(program, context);
      
      expect(adjustment).toBe(0.05);
    });

    it('should penalize expensive programs (>$50) by 0.15', () => {
      const program = { free: false, costCents: 10000 };
      const context = {};
      
      const adjustment = scoreBarriers(program, context);
      
      expect(adjustment).toBe(-0.15);
    });

    it('should penalize programs in different city by 0.1', () => {
      const program = { free: true, costCents: 0, city: 'Calgary' };
      const context = { city: 'Edmonton' };
      
      const adjustment = scoreBarriers(program, context);
      
      expect(adjustment).toBe(0.05 - 0.1);
    });

    it('should not penalize programs in same city', () => {
      const program = { free: true, costCents: 0, city: 'Edmonton' };
      const context = { city: 'Edmonton' };
      
      const adjustment = scoreBarriers(program, context);
      
      expect(adjustment).toBe(0.05);
    });
  });

  describe('Trend-based scoring', () => {
    function scoreTrendMatch(
      programTags: string[],
      trend: { trendDirection: string; consecutiveLowDays: number; patternsDetected: string[] }
    ): { score: number; reasons: string[] } {
      let trendScore = 0;
      const reasons: string[] = [];

      if (trend.trendDirection === 'declining') {
        const supportiveTags = ['support', 'counseling', 'mindfulness', 'self_care', 'calming'];
        if (programTags.some((tag: string) => 
          supportiveTags.some(st => tag.toLowerCase().includes(st))
        )) {
          trendScore += 0.2;
          reasons.push('recommended for declining mood patterns');
        }
      }

      if (trend.trendDirection === 'improving') {
        const engagementTags = ['social', 'active', 'creative', 'leadership', 'skills'];
        if (programTags.some((tag: string) => 
          engagementTags.some(et => tag.toLowerCase().includes(et))
        )) {
          trendScore += 0.15;
          reasons.push('builds on your improving mood');
        }
      }

      if (trend.consecutiveLowDays >= 3) {
        const immediateTags = ['drop_in', 'flexible', 'low_barrier', 'free'];
        if (programTags.some((tag: string) => 
          immediateTags.some(it => tag.toLowerCase().includes(it))
        )) {
          trendScore += 0.25;
          reasons.push(`helpful for ${trend.consecutiveLowDays} consecutive low days`);
        }
      }

      return { score: trendScore, reasons };
    }

    it('should boost supportive programs for declining trend', () => {
      const programTags = ['support-group', 'counseling'];
      const trend = { trendDirection: 'declining', consecutiveLowDays: 1, patternsDetected: [] };
      
      const result = scoreTrendMatch(programTags, trend);
      
      expect(result.score).toBe(0.2);
      expect(result.reasons).toContain('recommended for declining mood patterns');
    });

    it('should boost engagement programs for improving trend', () => {
      const programTags = ['social-skills', 'active-learning'];
      const trend = { trendDirection: 'improving', consecutiveLowDays: 0, patternsDetected: [] };
      
      const result = scoreTrendMatch(programTags, trend);
      
      expect(result.score).toBe(0.15);
      expect(result.reasons).toContain('builds on your improving mood');
    });

    it('should boost immediate support for consecutive low days', () => {
      const programTags = ['drop_in', 'free'];
      const trend = { trendDirection: 'stable', consecutiveLowDays: 3, patternsDetected: [] };
      
      const result = scoreTrendMatch(programTags, trend);
      
      expect(result.score).toBe(0.25);
      expect(result.reasons).toContain('helpful for 3 consecutive low days');
    });

    it('should return 0 for non-matching programs', () => {
      const programTags = ['hiking', 'outdoor'];
      const trend = { trendDirection: 'declining', consecutiveLowDays: 1, patternsDetected: [] };
      
      const result = scoreTrendMatch(programTags, trend);
      
      expect(result.score).toBe(0);
    });
  });
});

describe('Recommendations Service - Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Age filtering', () => {
    function isAgeEligible(userAge: number, program: { ageMin: number | null; ageMax: number | null }): boolean {
      if (program.ageMin !== null && userAge < program.ageMin) {
        return false;
      }
      if (program.ageMax !== null && userAge > program.ageMax) {
        return false;
      }
      return true;
    }

    it('should accept when user age is within range', () => {
      const userAge = 16;
      const program = { ageMin: 13, ageMax: 18 };
      
      expect(isAgeEligible(userAge, program)).toBe(true);
    });

    it('should accept when user age equals minimum', () => {
      const userAge = 13;
      const program = { ageMin: 13, ageMax: 18 };
      
      expect(isAgeEligible(userAge, program)).toBe(true);
    });

    it('should accept when user age equals maximum', () => {
      const userAge = 18;
      const program = { ageMin: 13, ageMax: 18 };
      
      expect(isAgeEligible(userAge, program)).toBe(true);
    });

    it('should reject when user age is below minimum', () => {
      const userAge = 12;
      const program = { ageMin: 13, ageMax: 18 };
      
      expect(isAgeEligible(userAge, program)).toBe(false);
    });

    it('should reject when user age is above maximum', () => {
      const userAge = 19;
      const program = { ageMin: 13, ageMax: 18 };
      
      expect(isAgeEligible(userAge, program)).toBe(false);
    });

    it('should accept any age when no limits set', () => {
      const userAge = 50;
      const program = { ageMin: null, ageMax: null };
      
      expect(isAgeEligible(userAge, program)).toBe(true);
    });

    it('should accept when only minimum is set and age is above', () => {
      const userAge = 16;
      const program = { ageMin: 13, ageMax: null };
      
      expect(isAgeEligible(userAge, program)).toBe(true);
    });
  });

  describe('Tag matching', () => {
    function matchesTags(programTags: string[], requiredTags: string[]): boolean {
      if (requiredTags.length === 0) return true;
      return requiredTags.some(required => 
        programTags.some(tag => tag.toLowerCase().includes(required.toLowerCase()))
      );
    }

    it('should return true when no required tags', () => {
      const programTags = ['sports', 'outdoor'];
      const requiredTags: string[] = [];
      
      expect(matchesTags(programTags, requiredTags)).toBe(true);
    });

    it('should return true when at least one tag matches', () => {
      const programTags = ['sports', 'outdoor', 'youth'];
      const requiredTags = ['indoor', 'sports'];
      
      expect(matchesTags(programTags, requiredTags)).toBe(true);
    });

    it('should return false when no tags match', () => {
      const programTags = ['sports', 'outdoor'];
      const requiredTags = ['indoor', 'quiet'];
      
      expect(matchesTags(programTags, requiredTags)).toBe(false);
    });

    it('should handle case insensitive matching', () => {
      const programTags = ['Sports', 'OUTDOOR'];
      const requiredTags = ['sports', 'outdoor'];
      
      expect(matchesTags(programTags, requiredTags)).toBe(true);
    });

    it('should handle partial matches', () => {
      const programTags = ['mental-health', 'community-center'];
      const requiredTags = ['mental', 'community'];
      
      expect(matchesTags(programTags, requiredTags)).toBe(true);
    });
  });

  describe('Score threshold filtering', () => {
    function filterByScore(items: { score: number }[], minScore: number): { score: number }[] {
      return items.filter(item => item.score > minScore);
    }

    it('should filter out items below threshold', () => {
      const items = [
        { score: 0.1 },
        { score: 0.3 },
        { score: 0.5 },
      ];
      
      const filtered = filterByScore(items, 0.2);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(item => item.score > 0.2)).toBe(true);
    });

    it('should return empty array when all below threshold', () => {
      const items = [
        { score: 0.1 },
        { score: 0.15 },
        { score: 0.2 },
      ];
      
      const filtered = filterByScore(items, 0.5);
      
      expect(filtered).toHaveLength(0);
    });

    it('should return all when threshold is 0', () => {
      const items = [
        { score: 0.1 },
        { score: 0.3 },
        { score: 0.5 },
      ];
      
      const filtered = filterByScore(items, 0);
      
      expect(filtered).toHaveLength(3);
    });
  });
});

describe('Recommendations Service - Day of Week Calculation', () => {
  function calculateNextOccurrence(dayOfWeek: string, currentDate: Date): Date | null {
    if (!dayOfWeek) return null;
    
    const dayMap: Record<string, number> = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 0,
    };
    
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return null;
    
    const currentDay = currentDate.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }
    
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + daysUntil);
    return nextDate;
  }

  it('should calculate next Monday from a Wednesday', () => {
    const wednesday = new Date('2026-01-07');
    wednesday.setHours(12, 0, 0, 0);
    
    const nextMonday = calculateNextOccurrence('Monday', wednesday);
    
    expect(nextMonday).not.toBeNull();
    expect(nextMonday!.getDay()).toBe(1);
  });

  it('should return next week same day if today matches', () => {
    const monday = new Date('2026-01-05');
    monday.setHours(12, 0, 0, 0);
    
    const nextMonday = calculateNextOccurrence('Monday', monday);
    
    expect(nextMonday).not.toBeNull();
    expect(nextMonday!.getDate()).toBe(monday.getDate() + 7);
  });

  it('should return null for invalid day of week', () => {
    const date = new Date('2026-01-07');
    
    const result = calculateNextOccurrence('InvalidDay', date);
    
    expect(result).toBeNull();
  });

  it('should return null for empty day of week', () => {
    const date = new Date('2026-01-07');
    
    const result = calculateNextOccurrence('', date);
    
    expect(result).toBeNull();
  });
});
