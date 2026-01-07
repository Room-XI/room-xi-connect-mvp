import express from 'express';
import { db } from '../db.js';
import { dailyQuotes, profiles } from '../schema.js';
import { eq, and, sql } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

/**
 * GET /api/quotes/daily
 * Get the daily quote for the user
 */
router.get('/daily', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's profile to check last quote date
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastQuoteDate = profile?.lastQuoteDate;
    const lastQuoteId = profile?.lastQuoteId;

    let quote;
    
    // If same day and already has a quote, return the same quote
    if (lastQuoteDate === today && lastQuoteId) {
      [quote] = await db
        .select()
        .from(dailyQuotes)
        .where(eq(dailyQuotes.id, lastQuoteId))
        .limit(1);
    } else {
      // Get a new random quote for today
      // Use a deterministic random based on date and user ID to ensure consistency
      const dateHash = today.split('-').join('');
      const userIdHash = req.session.userId.replace(/-/g, '').slice(0, 8);
      const seed = parseInt(dateHash + userIdHash, 16) % 1000000;
      
      // Get total count of quotes
      const [countResult] = await db
        .select({ count: sql`count(*)::int` })
        .from(dailyQuotes);
      
      const totalQuotes = countResult?.count || 30;
      const quoteIndex = seed % totalQuotes;
      
      // Get the quote at the calculated index
      [quote] = await db
        .select()
        .from(dailyQuotes)
        .limit(1)
        .offset(quoteIndex);

      // Update user's profile with new quote info
      if (quote) {
        await db
          .update(profiles)
          .set({
            lastQuoteDate: today,
            lastQuoteId: quote.id,
            updatedAt: new Date()
          })
          .where(eq(profiles.userId, req.session.userId));
      }
    }

    if (!quote) {
      // Fallback quote if database is empty
      quote = {
        id: 0,
        quote: "Every moment is a fresh beginning.",
        author: "T.S. Eliot",
        category: "new_beginnings"
      };
    }

    res.json({
      data: quote
    });
  } catch (error) {
    logger.error({ err: error, context: 'quotes-daily' }, 'Error fetching daily quote');
    res.status(500).json({ error: 'Failed to fetch daily quote' });
  }
});

/**
 * GET /api/quotes/all
 * Get all available quotes (admin only)
 */
router.get('/all', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is admin
    const [profile] = await db
      .select({ isAdmin: profiles.isAdmin })
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const quotes = await db.select().from(dailyQuotes);
    
    res.json({
      data: quotes,
      count: quotes.length
    });
  } catch (error) {
    logger.error({ err: error, context: 'quotes-all' }, 'Error fetching all quotes');
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

/**
 * POST /api/quotes
 * Add a new quote (admin only)
 */
router.post('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is admin
    const [profile] = await db
      .select({ isAdmin: profiles.isAdmin })
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { quote, author, category } = req.body;

    if (!quote || typeof quote !== 'string' || quote.trim().length === 0) {
      return res.status(400).json({ error: 'Quote text is required' });
    }

    const [newQuote] = await db
      .insert(dailyQuotes)
      .values({
        quote: quote.trim(),
        author: author?.trim() || 'Unknown',
        category: category?.trim() || 'general'
      })
      .returning();

    res.json({
      success: true,
      data: newQuote
    });
  } catch (error) {
    logger.error({ err: error, context: 'quotes-add' }, 'Error adding quote');
    res.status(500).json({ error: 'Failed to add quote' });
  }
});

export default router;