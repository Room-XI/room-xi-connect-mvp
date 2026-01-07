import OpenAI from 'openai';
import logger from '../logger.ts';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
}

export async function moderateText(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) {
    return { flagged: false, categories: {} };
  }

  try {
    const result = await openai.moderations.create({
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
    return { flagged: false, categories: {} };
  }
}
