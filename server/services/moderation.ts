import OpenAI from 'openai';

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
      console.log('[Moderation] debug', { flagged, categories });
    } else {
      console.log('[Moderation] summary', { flagged, categoriesCount: Object.keys(categories).length });
    }

    return { flagged, categories };
  } catch (error: any) {
    console.error('[Moderation] Error calling moderation API:', {
      message: error?.message,
      status: error?.status,
    });
    return { flagged: false, categories: {} };
  }
}
