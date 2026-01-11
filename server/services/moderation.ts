import OpenAI from 'openai';
import logger from '../logger.ts';

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
}

// Lazy initialization of OpenAI client - only create when first used and key is available
let openaiClient: OpenAI | null = null;
let moderationDisabledWarningLogged = false;

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  
  if (!apiKey) {
    if (!moderationDisabledWarningLogged) {
      logger.warn({ context: 'moderation' }, 'AI_INTEGRATIONS_OPENAI_API_KEY not set - moderation is disabled (content will not be filtered)');
      moderationDisabledWarningLogged = true;
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

export async function moderateText(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) {
    return { flagged: false, categories: {} };
  }

  const client = getOpenAIClient();
  
  // Graceful degradation: if no API key, skip moderation
  if (!client) {
    return { flagged: false, categories: {} };
  }

  try {
    const result = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    });

    const moderationResult = result.results?.[0];
    const flagged = moderationResult?.flagged ?? false;
    const categories = (moderationResult?.categories as unknown as Record<string, boolean>) ?? {};

    if (process.env.NODE_ENV !== 'production') {
      logger.debug({ context: 'moderation', flagged, categories }, 'Moderation debug');
    } else {
      logger.info({ context: 'moderation', flagged, categoriesCount: Object.keys(categories).length }, 'Moderation summary');
    }

    return { flagged, categories };
  } catch (error: any) {
    logger.error({ err: error, context: 'moderation-api', message: error?.message, status: error?.status }, 'Error calling moderation API');
    // Fail open - don't block content if moderation fails
    return { flagged: false, categories: {} };
  }
}
