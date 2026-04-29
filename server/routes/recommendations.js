/**
 * Program Recommendations Routes
 * 
 * Provides personalized program recommendations based on user profile.
 * Uses profile interests and demographics to match relevant programs.
 */

import { Router } from 'express';
import { db } from '../db.ts';
import { programs, profiles } from '../schema.ts';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import logger from '../logger.ts';

const router = Router();

/**
 * GET /api/programs/recommendations
 * 
 * Returns personalized program recommendations for the authenticated user.
 * Matches programs based on user interests, age, and location.
 */
router.get('/recommendations', async (req, res) => {
  try {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user profile
    const [userProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!userProfile) {
      return res.json({ recommendations: [] });
    }

    // Get user interests (stored as JSON array)
    const userInterests = userProfile.interests || [];
    const userAge = userProfile.age;
    const userCity = userProfile.city;

    // Build query for active programs
    let query = db
      .select({
        id: programs.id,
        title: programs.title,
        organizer: programs.organizer,
        category: programs.category,
        location: programs.location,
        description: programs.description,
        ageMin: programs.ageMin,
        ageMax: programs.ageMax,
        tags: programs.tags,
      })
      .from(programs)
      .where(
        and(
          eq(programs.isActive, true),
          isNull(programs.deletedAt)
        )
      )
      .limit(20);

    const allPrograms = await query;

    // Score and rank programs based on user profile
    const scoredPrograms = allPrograms.map(program => {
      let score = 0;
      let matchReasons = [];

      // Interest matching
      const programTags = program.tags || [];
      const programCategory = program.category?.toLowerCase() || '';
      
      for (const interest of userInterests) {
        const interestLower = interest.toLowerCase();
        
        // Check tags
        if (programTags.some(tag => tag.toLowerCase().includes(interestLower))) {
          score += 30;
          matchReasons.push(`Matches your interest in ${interest}`);
        }
        
        // Check category
        if (programCategory.includes(interestLower)) {
          score += 25;
          if (!matchReasons.length) {
            matchReasons.push(`Related to ${interest}`);
          }
        }
        
        // Check title/description
        const titleLower = program.title?.toLowerCase() || '';
        const descLower = program.description?.toLowerCase() || '';
        if (titleLower.includes(interestLower) || descLower.includes(interestLower)) {
          score += 15;
          if (!matchReasons.length) {
            matchReasons.push(`Related to ${interest}`);
          }
        }
      }

      // Age matching
      if (userAge) {
        const ageMin = program.ageMin || 0;
        const ageMax = program.ageMax || 100;
        if (userAge >= ageMin && userAge <= ageMax) {
          score += 20;
          if (!matchReasons.length) {
            matchReasons.push('Age appropriate');
          }
        } else {
          // Penalize if outside age range
          score -= 50;
        }
      }

      // Location matching
      if (userCity && program.location) {
        const locationLower = program.location.toLowerCase();
        const cityLower = userCity.toLowerCase();
        if (locationLower.includes(cityLower) || cityLower.includes(locationLower)) {
          score += 15;
          if (!matchReasons.length) {
            matchReasons.push('Near you');
          }
        }
      }

      // Boost programs with good categories
      const boostCategories = ['mental health', 'wellness', 'career', 'education', 'skills'];
      if (boostCategories.some(cat => programCategory.includes(cat))) {
        score += 10;
      }

      return {
        ...program,
        matchScore: score,
        matchReason: matchReasons[0] || 'Recommended for you',
      };
    });

    // Sort by score and filter out negative scores
    const recommendations = scoredPrograms
      .filter(p => p.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.title,
        organizer: p.organizer,
        category: p.category,
        location: p.location,
        nextSession: null, // Could be enhanced with schedule data
        matchReason: p.matchReason,
        matchScore: p.matchScore,
      }));

    logger.info({
      context: 'recommendations',
      userId: req.session.userId,
      recommendationCount: recommendations.length,
    }, 'Generated program recommendations');

    res.json({ recommendations });

  } catch (error) {
    logger.error({
      err: error,
      context: 'recommendations',
      userId: req.session?.userId,
    }, 'Error generating recommendations');

    res.status(500).json({ 
      error: 'Failed to load recommendations',
      recommendations: [] 
    });
  }
});

export default router;
