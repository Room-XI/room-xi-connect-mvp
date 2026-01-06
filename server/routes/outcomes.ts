/// <reference path="../types/session.d.ts" />

import express from 'express';
import { db } from '../db.js';
import {
  createOutcomeEvent,
  updateOutcomeEvent,
  getUserOutcomes,
  getProgramOutcomes,
  getOutcomeById,
  getUserOutcomeSummary,
  type OutcomeEventData,
} from '../services/outcomes.js';
import { getProgramPeerInsights } from '../services/peerInsights.js';
import { checkPrivacyConsent, requirePrivacyConsent } from '../middleware/consent.ts';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check reflections consent for sharing program feedback
    const consent = await checkPrivacyConsent(req.session.userId, 'reflections');
    if (!consent.reflections) {
      return res.status(403).json({ 
        error: 'Consent required',
        code: 'CONSENT_REQUIRED',
        missingConsents: ['reflections'],
        message: 'Please enable reflection sharing in Privacy Center to submit program feedback'
      });
    }

    const {
      programId,
      recommendationEventId,
      attended,
      attendanceDate,
      sessionsAttended,
      helpfulnessRating,
      wouldRecommend,
      reflectionText,
      moodBefore,
      moodAfter,
      barriersEncountered,
      barriersResolved,
    } = req.body;

    if (!programId || typeof attended !== 'boolean') {
      return res.status(400).json({ error: 'programId and attended are required' });
    }

    if (helpfulnessRating && (helpfulnessRating < 1 || helpfulnessRating > 5)) {
      return res.status(400).json({ error: 'helpfulnessRating must be between 1 and 5' });
    }

    if (reflectionText && reflectionText.length > 1000) {
      return res.status(400).json({ error: 'reflectionText too long (max 1000 characters)' });
    }

    const outcomeData: OutcomeEventData = {
      userId: req.session.userId,
      programId,
      recommendationEventId: recommendationEventId || null,
      attended,
      attendanceDate: attendanceDate || new Date().toISOString().split('T')[0],
      sessionsAttended: sessionsAttended || 1,
      helpfulnessRating: helpfulnessRating || null,
      wouldRecommend: wouldRecommend !== undefined ? wouldRecommend : null,
      reflectionText: reflectionText || null,
      moodBefore: moodBefore || null,
      moodAfter: moodAfter || null,
      barriersEncountered: barriersEncountered || [],
      barriersResolved: barriersResolved || false,
    };

    const outcome = await createOutcomeEvent(outcomeData);

    res.json(outcome);
  } catch (error) {
    console.error('[Outcomes API] Create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check reflections consent for updating program feedback
    const consent = await checkPrivacyConsent(req.session.userId, 'reflections');
    if (!consent.reflections) {
      return res.status(403).json({ 
        error: 'Consent required',
        code: 'CONSENT_REQUIRED',
        missingConsents: ['reflections'],
        message: 'Please enable reflection sharing in Privacy Center to update program feedback'
      });
    }

    const { id } = req.params;
    const {
      helpfulnessRating,
      wouldRecommend,
      reflectionText,
      moodBefore,
      moodAfter,
      barriersEncountered,
      barriersResolved,
    } = req.body;

    if (helpfulnessRating && (helpfulnessRating < 1 || helpfulnessRating > 5)) {
      return res.status(400).json({ error: 'helpfulnessRating must be between 1 and 5' });
    }

    if (reflectionText && reflectionText.length > 1000) {
      return res.status(400).json({ error: 'reflectionText too long (max 1000 characters)' });
    }

    const updates: Partial<OutcomeEventData> = {};
    if (helpfulnessRating !== undefined) updates.helpfulnessRating = helpfulnessRating;
    if (wouldRecommend !== undefined) updates.wouldRecommend = wouldRecommend;
    if (reflectionText !== undefined) updates.reflectionText = reflectionText;
    if (moodBefore !== undefined) updates.moodBefore = moodBefore;
    if (moodAfter !== undefined) updates.moodAfter = moodAfter;
    if (barriersEncountered !== undefined) updates.barriersEncountered = barriersEncountered;
    if (barriersResolved !== undefined) updates.barriersResolved = barriersResolved;

    const updated = await updateOutcomeEvent(id, req.session.userId, updates);

    if (!updated) {
      return res.status(404).json({ error: 'Outcome not found or unauthorized' });
    }

    res.json(updated);
  } catch (error) {
    console.error('[Outcomes API] Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'limit must be between 1 and 100' });
    }

    const outcomes = await getUserOutcomes(req.session.userId, limit);

    res.json(outcomes);
  } catch (error) {
    console.error('[Outcomes API] Get user outcomes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const summary = await getUserOutcomeSummary(req.session.userId);

    res.json(summary);
  } catch (error) {
    console.error('[Outcomes API] Get summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const outcome = await getOutcomeById(id, req.session.userId);

    if (!outcome) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    res.json(outcome);
  } catch (error) {
    console.error('[Outcomes API] Get outcome error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/program/:programId', requirePrivacyConsent('research'), async (req, res) => {
  try {
    const { programId } = req.params;

    const insights = await getProgramPeerInsights(programId);

    if (!insights) {
      return res.json({
        suppressed: true,
        suppressionReason: 'No data available yet',
      });
    }

    res.json(insights);
  } catch (error) {
    console.error('[Outcomes API] Get program insights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
