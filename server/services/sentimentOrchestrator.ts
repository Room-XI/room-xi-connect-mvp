/**
 * Sentiment Orchestrator (MVP)
 * - Always runs "guardian" keyword detection for crisis signals.
 * - Optionally runs LLM sentiment extraction if consent + OpenAI key exists.
 * - Writes results to sentiment_analyses and mirrors crisis flags onto checkins.
 */

import OpenAI from 'openai';
import logger from '../logger.ts';
import { db } from '../db.js';
import { checkins, sentimentAnalyses, profiles } from '../schema.ts';
import { and, eq } from 'drizzle-orm';
import { sanitizePrompt, detectCrisis } from './ximi.ts';

type SourceType = 'checkin' | 'journal';

export interface SentimentResult {
  sentimentLabel: string;
  sentimentScore: number | null;
  emotions: unknown;
  themes: string[];
  confidence: number | null;
  crisisFlagged: boolean;
  crisisFlags: unknown;
  model: string | null;
  raw: unknown;
}

let openaiClient: OpenAI | null = null;
let openaiDisabledWarned = false;

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!apiKey) {
    if (!openaiDisabledWarned) {
      logger.warn({ context: 'sentiment-orchestrator' }, 'OpenAI API key missing; sentiment LLM disabled (guardian-only mode).');
      openaiDisabledWarned = true;
    }
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }

  return openaiClient;
}

function parseJsonSafe(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return { parseError: true, value };
  }
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

async function hasAiConsent(userId: string): Promise<boolean> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return Boolean(profile?.ximiConsent);
}

async function runLlMExtract(text: string): Promise<Pick<SentimentResult, 'sentimentLabel'|'sentimentScore'|'emotions'|'themes'|'confidence'|'model'|'raw'|'crisisFlagged'|'crisisFlags'>> {
  const client = getOpenAIClient();
  const model = process.env.AI_INTEGRATIONS_SENTIMENT_MODEL || 'gpt-4o-mini';

  if (!client) {
    return {
      sentimentLabel: 'unknown',
      sentimentScore: null,
      emotions: null,
      themes: [],
      confidence: null,
      crisisFlagged: false,
      crisisFlags: null,
      model: null,
      raw: { disabled: true, reason: 'missing_openai_key' },
    };
  }

  const system = [
    'You are a careful sentiment and emotion extractor for a youth wellness check-in.',
    'Return a single JSON object only (no markdown).',
    'Fields:',
    'sentiment_label: one of ["positive","neutral","negative","mixed","unknown"]',
    'sentiment_score: number between -1 and 1',
    'emotions: { primary: string, secondary?: string[] }',
    'themes: string[] (short phrases)',
    'confidence: number between 0 and 1',
    'crisis_risk: { level: "low"|"medium"|"high", reasons: string[] }',
  ].join('\n');

  const user = `Text:\n${text}`;

  try {
    const resp = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' } as any,
    });

    const content = resp.choices?.[0]?.message?.content ?? '';
    const raw = parseJsonSafe(content);

    const obj = (raw && typeof raw === 'object') ? (raw as any) : {};
    const sentimentLabel = typeof obj.sentiment_label === 'string' ? obj.sentiment_label : 'unknown';
    const score = coerceNumber(obj.sentiment_score);
    const confidence = coerceNumber(obj.confidence);
    const emotions = obj.emotions ?? null;
    const themes = Array.isArray(obj.themes) ? obj.themes.filter((t: unknown) => typeof t === 'string') : [];
    
    const crisisRisk = obj.crisis_risk ?? {};
    const llmCrisisFlagged = crisisRisk.level === 'high' || crisisRisk.level === 'medium';
    const llmCrisisFlags = llmCrisisFlagged ? crisisRisk : null;

    return {
      sentimentLabel,
      sentimentScore: score !== null ? clamp(score, -1, 1) : null,
      emotions,
      themes,
      confidence: confidence !== null ? clamp(confidence, 0, 1) : null,
      crisisFlagged: llmCrisisFlagged,
      crisisFlags: llmCrisisFlags,
      model,
      raw,
    };
  } catch (error) {
    logger.error({ err: error, context: 'sentiment-llm' }, 'LLM sentiment extraction failed');
    return {
      sentimentLabel: 'unknown',
      sentimentScore: null,
      emotions: null,
      themes: [],
      confidence: null,
      crisisFlagged: false,
      crisisFlags: null,
      model,
      raw: { error: String(error) },
    };
  }
}

/**
 * Analyzes text and stores sentiment result. Fire-and-forget safe.
 */
export async function analyzeAndStoreSentiment(
  userId: string,
  sourceType: SourceType,
  sourceId: string,
  rawText: string
): Promise<void> {
  try {
    const consent = await hasAiConsent(userId);
    
    const guardianResult = detectCrisis(rawText);
    const guardianFlagged = guardianResult.detected;

    let llm: Pick<SentimentResult, 'sentimentLabel'|'sentimentScore'|'emotions'|'themes'|'confidence'|'model'|'raw'|'crisisFlagged'|'crisisFlags'>;
    let sanitized: { sanitized: string; redactionCounts?: Record<string, number> } = { sanitized: rawText };

    if (consent) {
      sanitized = sanitizePrompt(rawText);
      llm = await runLlMExtract(sanitized.sanitized);
    } else {
      llm = {
        sentimentLabel: 'unknown',
        sentimentScore: null,
        emotions: null,
        themes: [],
        confidence: null,
        crisisFlagged: false,
        crisisFlags: null,
        model: null,
        raw: { skipped: true, reason: 'no_consent' },
      };
    }

    const crisisFlagged = guardianFlagged || llm.crisisFlagged;
    const crisisFlags = {
      guardian: guardianFlagged ? guardianResult.keywords : null,
      llm: llm.crisisFlags ?? null,
      redactions: (sanitized as any).redactionCounts ?? null,
    };

    await db.insert(sentimentAnalyses)
      .values({
        userId,
        sourceType,
        sourceId,
        sentimentLabel: llm.sentimentLabel || 'unknown',
        sentimentScore: llm.sentimentScore !== null ? String(llm.sentimentScore) : null,
        emotions: llm.emotions,
        themes: llm.themes || [],
        confidence: llm.confidence !== null ? String(llm.confidence) : null,
        crisisFlagged,
        crisisFlags,
        model: llm.model,
        raw: llm.raw,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [sentimentAnalyses.userId, sentimentAnalyses.sourceType, sentimentAnalyses.sourceId],
        set: {
          sentimentLabel: llm.sentimentLabel || 'unknown',
          sentimentScore: llm.sentimentScore !== null ? String(llm.sentimentScore) : null,
          emotions: llm.emotions,
          themes: llm.themes || [],
          confidence: llm.confidence !== null ? String(llm.confidence) : null,
          crisisFlagged,
          crisisFlags,
          model: llm.model,
          raw: llm.raw,
          updatedAt: new Date(),
        },
      });

    if (sourceType === 'checkin' && crisisFlagged) {
      await db.update(checkins)
        .set({
          crisisFlagged: true,
          crisisFlags,
          crisisResolvedAt: null,
        })
        .where(and(eq(checkins.id, sourceId), eq(checkins.userId, userId)));
    }

    logger.info(
      { userId, sourceType, sourceId, crisisFlagged, sentiment: llm.sentimentLabel, context: 'sentiment-orchestrator' },
      'Sentiment analysis completed'
    );
  } catch (error) {
    logger.error({ err: error, userId, sourceType, sourceId, context: 'sentiment-orchestrator' }, 'Failed to analyze/store sentiment');
  }
}
