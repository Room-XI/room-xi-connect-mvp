import OpenAI from 'openai';
import type { MoodKey } from '../../src/lib/moodConfig.js';
import type { MoodTrendData } from './moodTrends.ts';
import type { ProgramRecommendation } from './recommendations.ts';
import { moderateText } from './moderation.ts';
import { recordAiMetrics } from './aiTransparency.ts';
import logger from '../logger.ts';

let openaiClient: OpenAI | null = null;
let openaiDisabledWarningLogged = false;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    if (!openaiDisabledWarningLogged) {
      logger.warn({ context: 'ximi' }, 'AI_INTEGRATIONS_OPENAI_API_KEY not set - Ximi AI responses are disabled');
      openaiDisabledWarningLogged = true;
    }
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openaiClient;
}

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'end my life',
  'self-harm', 'cut myself', 'hurt myself', 'cutting',
  'overdose', 'pills', 'poison',
  'no one cares', 'everyone hates me', 'better off dead',
  'don\'t want to live', 'want to die', 'wish I was dead',
  'hopeless', 'worthless', 'nothing matters',
];

export interface XimiContext {
  moodType?: MoodKey;
  wellnessDimensions?: string[];
  recentNote?: string;
  moodTrend?: MoodTrendData | null;
  recommendations?: ProgramRecommendation[];
}

export interface XimiResponse {
  message: string;
  crisisDetected: boolean;
  crisisKeywords: string[];
}

export interface SanitizationResult {
  sanitized: string;
  redactionCounts: {
    emails: number;
    phones: number;
    urls: number;
    postalCodes: number;
  };
}

export function sanitizePrompt(text: string): SanitizationResult {
  let sanitized = text;
  const redactionCounts = {
    emails: 0,
    phones: 0,
    urls: 0,
    postalCodes: 0,
  };

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = sanitized.match(emailRegex);
  if (emailMatches) {
    redactionCounts.emails = emailMatches.length;
    sanitized = sanitized.replace(emailRegex, '[EMAIL]');
  }

  const phoneRegex = /(\+?1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}\b/g;
  const phoneMatches = sanitized.match(phoneRegex);
  if (phoneMatches) {
    redactionCounts.phones = phoneMatches.length;
    sanitized = sanitized.replace(phoneRegex, '[PHONE]');
  }

  const urlRegex = /https?:\/\/[^\s]+/g;
  const urlMatches = sanitized.match(urlRegex);
  if (urlMatches) {
    redactionCounts.urls = urlMatches.length;
    sanitized = sanitized.replace(urlRegex, '[URL]');
  }

  const postalCodeRegex = /[A-Za-z][0-9][A-Za-z]\s?[0-9][A-Za-z][0-9]/g;
  const postalCodeMatches = sanitized.match(postalCodeRegex);
  if (postalCodeMatches) {
    redactionCounts.postalCodes = postalCodeMatches.length;
    sanitized = sanitized.replace(postalCodeRegex, '[ADDRESS]');
  }

  if (Object.values(redactionCounts).some(count => count > 0)) {
    logger.info({
      context: 'pii-sanitization',
      redactionCounts,
      totalRedactions: Object.values(redactionCounts).reduce((sum, count) => sum + count, 0),
    }, 'PII redacted from Ximi prompt');
  }

  return {
    sanitized,
    redactionCounts,
  };
}

export function detectCrisis(text: string): { detected: boolean; keywords: string[] } {
  const lowerText = text.toLowerCase();
  const foundKeywords = CRISIS_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );

  return {
    detected: foundKeywords.length > 0,
    keywords: foundKeywords,
  };
}

const PROGRAM_FINDER_SYSTEM_PROMPT = `You are Ximi, a helpful Program Finder assistant for youth (ages 13-25). You help young people find programs, activities, events, and check their schedules.

ROLE:
You are ONLY a Program Finder. You search for programs, look up schedules, and suggest activities. You do NOT provide emotional support, journaling, wellness coaching, or general conversation.

CORE RULES:
1. ONLY discuss programs, events, schedules, and activities
2. NEVER ask reflective or emotional questions (e.g., "How are you feeling?", "What's weighing on you?")
3. NEVER invent program names, times, or venues — only reference data provided in tool results
4. NEVER provide medical, psychological, or diagnostic advice
5. NEVER journal or encourage journaling
6. Keep responses brief and factual (1-3 sentences max)
7. If the user mentions clear self-harm or suicidal intent, respond ONLY with: "CRISIS_DETECTED_ESCALATE_NOW"

YOUR TONE:
- Friendly but concise
- Use casual, youth-friendly language
- Be helpful and direct — get them the info they need
- Sound like a helpful directory, not a counselor

WHEN PRESENTING PROGRAMS:
- State the program name, time, location, and whether it's drop-in
- If multiple options exist, list them clearly
- If no results match, say so honestly and suggest checking the Explore page

WHAT TO AVOID:
- Don't use emojis unless the user does
- Don't ask about feelings, moods, or emotional states
- Don't offer encouragement or motivational statements
- Don't say things like "I'm here for you" or "You matter"
- Don't invent or fabricate any program information`;

export async function generateXimiResponse(
  userMessage: string,
  context: XimiContext
): Promise<XimiResponse> {
  const client = getOpenAIClient();
  if (!client) {
    return {
      message: "Ximi isn't available right now. You can browse programs on the Explore page or check your schedule directly.",
      crisisDetected: false,
      crisisKeywords: [],
    };
  }

  const crisisCheck = detectCrisis(userMessage);
  if (crisisCheck.detected) {
    return {
      message: "I noticed you mentioned something serious. Are you safe right now? If you need immediate help, please reach out to a crisis line: Kids Help Phone 1-800-668-6868 or text CONNECT to 686868.",
      crisisDetected: true,
      crisisKeywords: crisisCheck.keywords,
    };
  }

  const moderation = await moderateText(userMessage);
  if (moderation.flagged) {
    await recordAiMetrics({
      totalMessagesDelta: 1,
      moderationFlaggedDelta: 1,
    });
    return {
      message: "I can't help with that, but I can help you find programs and activities. Try asking about what's happening this week!",
      crisisDetected: false,
      crisisKeywords: [],
    };
  }

  const sanitizationResult = sanitizePrompt(userMessage);
  const sanitizedUserMessage = sanitizationResult.sanitized;

  const maxRetries = 3;
  let lastError: any;
  let modelToUse = 'gpt-4o-mini';
  let useGpt5Params = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completionParams: any = {
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: PROGRAM_FINDER_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: sanitizedUserMessage,
          },
        ],
      };

      if (useGpt5Params) {
        completionParams.temperature = 1;
        completionParams.max_completion_tokens = 150;
      } else {
        completionParams.temperature = 0.4;
        completionParams.max_tokens = 150;
      }

      const completion = await client.chat.completions.create(completionParams);

      if (process.env.NODE_ENV !== 'production') {
        logger.info({
          context: 'ximi-ai-response',
          model: modelToUse,
          hasChoices: !!completion.choices,
          choicesLength: completion.choices?.length,
          hasContent: !!completion.choices?.[0]?.message?.content,
          contentLength: completion.choices?.[0]?.message?.content?.length || 0,
          finishReason: completion.choices?.[0]?.finish_reason,
        }, 'OpenAI response received');
      }

      const responseText = completion.choices[0]?.message?.content?.trim();

      if (!responseText) {
        if (process.env.NODE_ENV !== 'production') {
          logger.error({
            context: 'ximi-ai-error', model: modelToUse,
            completion: JSON.stringify(completion, null, 2),
          }, 'Empty response from model');
        } else {
          logger.error({ context: 'ximi-ai-error', model: modelToUse }, 'Empty response from model');
        }
        throw new Error('Empty response from OpenAI API');
      }

      if (responseText.includes('CRISIS_DETECTED_ESCALATE_NOW')) {
        return {
          message: "I noticed you mentioned something serious. Are you safe right now? If you need immediate help, please reach out to a crisis line: Kids Help Phone 1-800-668-6868 or text CONNECT to 686868.",
          crisisDetected: true,
          crisisKeywords: ['ai_detected'],
        };
      }

      return {
        message: responseText,
        crisisDetected: false,
        crisisKeywords: [],
      };
    } catch (error: any) {
      logger.error({
        context: 'ximi-ai-error', model: modelToUse, attempt, maxRetries,
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? 'SET' : 'MISSING',
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'MISSING',
      }, 'Error with OpenAI API call');
      lastError = error;

      const status = error?.status || error?.response?.status;
      const isRateLimitError = status === 429;
      const isServerError = status >= 500 && status < 600;
      const isModelNotAvailable = status === 404 ||
        (error?.message && error.message.includes('model_not_found')) ||
        (error?.message && error.message.includes('does not exist'));

      if (modelToUse === 'gpt-5' && (isModelNotAvailable || attempt === 1)) {
        logger.info({ context: 'ximi-ai-fallback' }, 'gpt-5 not available or not responding properly, falling back to gpt-4o-mini');
        modelToUse = 'gpt-4o-mini';
        useGpt5Params = false;
        attempt--;
        continue;
      }

      if ((isRateLimitError || isServerError) && attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000) + Math.random() * 1000;
        logger.info({ context: 'ximi-ai-retry', backoffMs: Math.round(backoffMs), reason: isRateLimitError ? 'rate limit' : 'server error' }, 'Retrying after backoff');
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      break;
    }
  }

  logger.error({
    context: 'ximi-ai-error',
    error: lastError?.message || lastError,
    modelAttempted: modelToUse,
    env: {
      hasApiKey: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    },
  }, 'Failed after all retries');

  return {
    message: "I'm having trouble right now. You can browse programs on the Explore page or check your schedule directly.",
    crisisDetected: false,
    crisisKeywords: [],
  };
}
