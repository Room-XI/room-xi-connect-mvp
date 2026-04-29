/// <reference path="../types/session.d.ts" />

import express from 'express';
import { db } from '../db.ts';
import { ximiConversations, profiles, organizations, orgMembers } from '../schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { generateXimiResponse } from '../services/ximi.ts';
import { searchPrograms, getMySchedule, formatProgramResultsForAI, formatScheduleForAI } from '../services/programSearch.ts';
import { getRecommendationsWithContext } from '../services/recommendations.ts';
import { recordAiMetrics } from '../services/aiTransparency.ts';
import { escalateCrisis, hasRecentEscalation } from '../services/crisisEscalation.ts';
import { detectCrisis } from '../services/ximi.ts';
import type { MoodKey } from '../../src/lib/moodConfig.js';
import { validateBody } from '../middleware/validate.ts';
import { ximiChatSchema, ximiConsentSchema } from '../schemas/ximi.ts';
import { debugLog } from '../utils/logger.ts';
import { requireDataConsent } from '../middleware/consent.ts';
import logger from '../logger.ts';

type ProgramIntent = 'program_search' | 'my_schedule' | 'suggestions' | null;

function detectProgramIntent(message: string): ProgramIntent {
  const lower = message.toLowerCase();

  const scheduleKeywords = [
    'my schedule', 'my next game', 'my next practice', 'when is my',
    'my upcoming', 'what am i registered', 'my team', 'my tournament',
  ];
  if (scheduleKeywords.some(k => lower.includes(k))) return 'my_schedule';

  const programPhrases = [
    'programs', 'events', 'activities',
    'what\'s on', 'what\'s happening',
    'any programs', 'art programs', 'sports program',
    'drop-in', 'near me',
    'happening today', 'happening this week', 'happening now',
    'things to do', 'anything going on',
    'what can i do', 'find me a program', 'find me an activity',
    'search for programs', 'search for events',
    'look for programs', 'look for events',
    'show me programs', 'show me events',
    'what programs', 'what events',
    'programs today', 'events today',
    'programs this week', 'events this week',
  ];
  if (programPhrases.some(k => lower.includes(k))) return 'program_search';

  const hasProgramContext = /program|activit|event|class|session|drop.?in|sport|art|music|workshop/i.test(lower);

  const suggestionKeywords = [
    'suggest a program', 'suggest an activity', 'suggest something to do',
    'recommend a program', 'recommend an activity', 'recommend something to do',
    'what should i try', 'what should i join',
    'help me find a program', 'help me find an activity',
    'what do you suggest', 'any ideas for activities',
  ];
  if (suggestionKeywords.some(k => lower.includes(k))) return 'suggestions';

  if (hasProgramContext && /suggest|recommend|ideas|bored|something to do/.test(lower)) return 'suggestions';

  return null;
}

const REDIRECT_MESSAGE = "I'm Ximi, your program finder! I can help you search for programs and activities, check your schedule, or suggest something based on what's available. Try asking me things like \"What programs are on today?\" or \"Show me my schedule.\"";

function extractSearchTerms(message: string): string | undefined {
  const stopWords = new Set([
    'what', 'which', 'where', 'when', 'how', 'are', 'is', 'the', 'a', 'an',
    'any', 'some', 'do', 'does', 'can', 'i', 'me', 'my', 'you', 'your',
    'there', 'here', 'on', 'in', 'at', 'for', 'to', 'of', 'with', 'and',
    'or', 'but', 'not', 'that', 'this', 'it', 'show', 'find', 'search',
    'look', 'tell', 'give', 'get', 'have', 'has', 'been', 'be', 'am',
    'was', 'were', 'will', 'would', 'could', 'should', 'going',
    'happening', 'available', 'right', 'now',
  ]);
  const contextWords = new Set([
    'programs', 'events', 'activities', 'program', 'event', 'activity',
    'today', 'week', 'tomorrow', 'near', 'nearby',
  ]);

  const words = message.toLowerCase()
    .replace(/[?!.,;:'"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w) && !contextWords.has(w));

  return words.length > 0 ? words.join(' ') : undefined;
}

const router = express.Router();

router.get('/conversations', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ximiConversations)
      .where(eq(ximiConversations.userId, req.session.userId));

    const totalCount = countResult?.count || 0;

    const conversations = await db
      .select()
      .from(ximiConversations)
      .where(eq(ximiConversations.userId, req.session.userId))
      .orderBy(desc(ximiConversations.createdAt))
      .limit(limit)
      .offset(offset);

    const orderedConversations = conversations.reverse();

    res.json({
      conversations: orderedConversations,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    logger.error({ err: error, context: 'ximi-conversations' }, 'Get conversations error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/chat', requireDataConsent(), validateBody(ximiChatSchema), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { message, checkinId, moodType, wellnessDimensions, timeframe, lat, lng } = req.body;

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    debugLog('Ximi AI', 'Chat request - checking consent:', {
      userId: req.session.userId,
      profileExists: !!profile,
      ximiConsent: profile?.ximiConsent,
      timestamp: new Date().toISOString(),
    });

    if (!profile?.ximiConsent) {
      debugLog('Ximi AI', 'Chat blocked: consent not granted');
      return res.status(403).json({
        error: 'Ximi consent required',
        message: 'You need to accept Ximi AI terms before chatting.',
      });
    }

    debugLog('Ximi AI', 'Consent verified, processing chat request');

    const crisisCheck = detectCrisis(message);
    if (crisisCheck.detected) {
      const [conversation] = await db
        .insert(ximiConversations)
        .values({
          userId: req.session.userId,
          checkinId: checkinId || null,
          mode: 'program_finder',
          userMessage: message.trim(),
          ximiResponse: "I noticed you mentioned something serious. Are you safe right now? If you need immediate help, please reach out to a crisis line: Kids Help Phone 1-800-668-6868 or text CONNECT to 686868.",
          moodContext: moodType || null,
          dimensionsContext: wellnessDimensions || [],
          crisisDetected: true,
          crisisKeywords: crisisCheck.keywords,
        })
        .returning();

      await recordAiMetrics({
        totalMessagesDelta: 1,
        crisisDetectedDelta: 1,
        moderationFlaggedDelta: 0,
      });

      hasRecentEscalation(req.session.userId, 24).then(async (recentEscalation) => {
        if (!recentEscalation) {
          await escalateCrisis({
            userId: req.session.userId!,
            sourceType: 'ximi_chat',
            sourceId: conversation.id,
            triggerType: 'keywords',
          });
          logger.info({ userId: req.session.userId, conversationId: conversation.id, context: 'ximi-crisis' }, 'Crisis escalation triggered from Ximi chat');
        }
      }).catch(err => {
        logger.error({ err, userId: req.session.userId, context: 'ximi-crisis' }, 'Failed to escalate crisis from Ximi chat');
      });

      return res.json({
        ...conversation,
        resultType: 'crisis' as const,
        crisisDetected: true,
        trendContext: null,
        recommendationsIncluded: false,
      });
    }

    const intent = detectProgramIntent(message);

    if (intent === null) {
      const [conversation] = await db
        .insert(ximiConversations)
        .values({
          userId: req.session.userId,
          checkinId: checkinId || null,
          mode: 'program_finder',
          userMessage: message.trim(),
          ximiResponse: REDIRECT_MESSAGE,
          moodContext: moodType || null,
          dimensionsContext: wellnessDimensions || [],
          crisisDetected: false,
          crisisKeywords: [],
        })
        .returning();

      await recordAiMetrics({
        totalMessagesDelta: 1,
        crisisDetectedDelta: 0,
        moderationFlaggedDelta: 0,
      });

      return res.json({
        ...conversation,
        resultType: 'redirect' as const,
        crisisDetected: false,
        trendContext: null,
        recommendationsIncluded: false,
      });
    }

    const now = DateTime.now().setZone('America/Edmonton');
    let toolResults = '';

    if (intent === 'program_search') {
      const searchTimeframe = timeframe || (message.toLowerCase().includes('today') ? 'today' : 'next_7_days');
      const searchTerms = extractSearchTerms(message);
      const foundPrograms = await searchPrograms({
        query: searchTerms,
        timeframe: searchTimeframe as 'today' | 'next_7_days',
        lat,
        lng,
      });
      toolResults = formatProgramResultsForAI(foundPrograms, now.toISODate()!);
    } else if (intent === 'my_schedule') {
      const schedule = await getMySchedule(req.session.userId);
      toolResults = formatScheduleForAI(schedule, now.toISODate()!);
    } else if (intent === 'suggestions') {
      const recommendations = await getRecommendationsWithContext(
        req.session.userId,
        moodType as MoodKey,
        wellnessDimensions,
        null,
        lat,
        lng,
        !!lat && !!lng
      );
      if (recommendations.length > 0) {
        toolResults = `\n\nSUGGESTED PROGRAMS (as of ${now.toISODate()}):\n`;
        toolResults += `IMPORTANT: Only mention programs from this list. Do not make up program names or details.\n`;
        recommendations.slice(0, 5).forEach((r, i) => {
          toolResults += `${i + 1}. "${r.title}" - ${r.locationName || 'TBD'}, ${r.dayOfWeek || ''} ${r.startTime}-${r.endTime}${r.free ? ' (free)' : ''} — ${r.triggerReason}\n`;
        });
      } else {
        toolResults = `\nNo personalized suggestions available right now. Suggest the user check the Explore page to browse all programs.\n`;
      }
    }

    let schoolSafeMode = false;
    let orgXimiMode = 'program_finder';
    if (req.session.organizationId) {
      const [org] = await db
        .select({ schoolSafeMode: organizations.schoolSafeMode, ximiMode: organizations.ximiMode })
        .from(organizations)
        .where(eq(organizations.id, req.session.organizationId))
        .limit(1);
      schoolSafeMode = !!org?.schoolSafeMode;
      orgXimiMode = org?.ximiMode || 'program_finder';
    } else {
      const memberships = await db
        .select({ schoolSafeMode: organizations.schoolSafeMode, ximiMode: organizations.ximiMode })
        .from(orgMembers)
        .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
        .where(eq(orgMembers.userId, req.session.userId));
      if (memberships.some(m => m.schoolSafeMode)) {
        schoolSafeMode = true;
      }
      const restrictedMode = memberships.find(m => m.ximiMode !== 'program_finder');
      if (restrictedMode) {
        orgXimiMode = restrictedMode.ximiMode;
      }
    }

    const skipLlm = schoolSafeMode || orgXimiMode === 'deterministic';

    const resultType = intent === 'program_search' ? 'program_results' :
                       intent === 'my_schedule' ? 'schedule_results' :
                       'suggestions';

    let ximiResponse: { message: string; crisisDetected: boolean; crisisKeywords: string[] };

    if (skipLlm) {
      const safeMessage = toolResults.trim()
        ? `Here's what I found:\n${toolResults.trim()}`
        : "I couldn't find any matching programs right now. Try checking the Explore page to browse all available programs.";
      ximiResponse = { message: safeMessage, crisisDetected: false, crisisKeywords: [] };
    } else {
      ximiResponse = await generateXimiResponse(message + toolResults, {});
    }

    const [conversation] = await db
      .insert(ximiConversations)
      .values({
        userId: req.session.userId,
        checkinId: checkinId || null,
        mode: 'program_finder',
        userMessage: message.trim(),
        ximiResponse: ximiResponse.message,
        moodContext: moodType || null,
        dimensionsContext: wellnessDimensions || [],
        crisisDetected: ximiResponse.crisisDetected,
        crisisKeywords: ximiResponse.crisisKeywords,
      })
      .returning();

    await recordAiMetrics({
      totalMessagesDelta: 1,
      crisisDetectedDelta: ximiResponse.crisisDetected ? 1 : 0,
      moderationFlaggedDelta: 0,
    });

    if (ximiResponse.crisisDetected && conversation.id) {
      hasRecentEscalation(req.session.userId, 24).then(async (recentEscalation) => {
        if (!recentEscalation) {
          await escalateCrisis({
            userId: req.session.userId!,
            sourceType: 'ximi_chat',
            sourceId: conversation.id,
            triggerType: 'keywords',
          });
          logger.info({ userId: req.session.userId, conversationId: conversation.id, context: 'ximi-crisis' }, 'Crisis escalation triggered from Ximi chat');
        }
      }).catch(err => {
        logger.error({ err, userId: req.session.userId, context: 'ximi-crisis' }, 'Failed to escalate crisis from Ximi chat');
      });
    }

    res.json({
      ...conversation,
      resultType,
      crisisDetected: ximiResponse.crisisDetected,
      trendContext: null,
      recommendationsIncluded: false,
    });
  } catch (error) {
    logger.error({ err: error, context: 'ximi-chat' }, 'Ximi chat error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/follow-up', (_req, res) => {
  return res.status(410).json({
    error: 'Gone',
    message: 'The follow-up endpoint has been removed. Use /api/ximi/chat with program-related questions instead.',
  });
});

router.post('/consent', async (req, res) => {
  try {
    if (!req.session.userId) {
      debugLog('Ximi AI', 'Consent update failed: not authenticated');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { consent } = req.body;

    if (typeof consent !== 'boolean') {
      debugLog('Ximi AI', 'Consent update failed: invalid consent type:', typeof consent);
      return res.status(400).json({ error: 'consent must be a boolean' });
    }

    debugLog('Ximi AI', 'Updating consent for user:', {
      userId: req.session.userId,
      consent,
      timestamp: new Date().toISOString(),
    });

    await db
      .insert(profiles)
      .values({
        userId: req.session.userId,
        ximiConsent: consent,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ximiConsent: consent }
      });

    debugLog('Ximi AI', 'Consent updated successfully:', {
      userId: req.session.userId,
      ximiConsent: consent,
      timestamp: new Date().toISOString(),
    });

    res.json({
      ximiConsent: consent,
      message: consent ? 'Ximi AI enabled' : 'Ximi AI disabled'
    });
  } catch (error) {
    logger.error({ err: error, context: 'ximi-consent' }, 'Update consent error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trends', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getLatestMoodTrend, computeMoodTrends, storeMoodTrends } = await import('../services/moodTrends.ts');

    const windowType = (req.query.windowType as string) || 'week';

    if (!['week', 'month', 'quarter'].includes(windowType)) {
      return res.status(400).json({ error: 'Invalid windowType. Must be "week", "month", or "quarter"' });
    }

    debugLog('Ximi AI', `Fetching ${windowType} trends for user ${req.session.userId}`);

    let trend = await getLatestMoodTrend(req.session.userId, windowType as 'week' | 'month' | 'quarter');

    if (!trend) {
      debugLog('Ximi AI', 'No existing trend found, computing new trend...');
      const trendData = await computeMoodTrends(req.session.userId, windowType as 'week' | 'month' | 'quarter');

      if (trendData) {
        await storeMoodTrends(trendData);
        trend = trendData;
      }
    }

    if (!trend) {
      return res.status(404).json({
        error: 'No trend data available',
        message: 'Not enough check-in data to compute trends'
      });
    }

    res.json(trend);
  } catch (error) {
    logger.error({ err: error, context: 'ximi-trends' }, 'Get trends error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/recommendations', requireDataConsent(), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentMood, wellnessDimensions, includetrends, userLat, userLng, prioritizeNearby } = req.body;

    const { getLatestMoodTrend } = await import('../services/moodTrends.ts');

    debugLog('Ximi AI', 'Generating recommendations for user', req.session.userId, {
      hasLocation: !!(userLat && userLng),
      prioritizeNearby: prioritizeNearby || false,
    });

    let moodTrend: any = null;
    if (includetrends !== false) {
      moodTrend = await getLatestMoodTrend(req.session.userId, 'week');
    }

    const recommendations = await getRecommendationsWithContext(
      req.session.userId,
      currentMood as MoodKey,
      wellnessDimensions,
      moodTrend,
      userLat,
      userLng,
      prioritizeNearby
    );

    res.json({
      recommendations,
      trendContext: moodTrend,
      count: recommendations.length,
    });
  } catch (error) {
    logger.error({ err: error, context: 'ximi-recommendations' }, 'Get recommendations error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
