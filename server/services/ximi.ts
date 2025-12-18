import OpenAI from 'openai';
import type { MoodKey } from '../../src/lib/moodConfig.js';
import type { MoodTrendData } from './moodTrends.ts';
import type { ProgramRecommendation } from './recommendations.ts';
import { moderateText } from './moderation.ts';
import { recordAiMetrics } from './aiTransparency.ts';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

const UNIFIED_SYSTEM_PROMPT = `You are Ximi, a warm, curious, and grounded AI companion for youth (ages 13-25). You blend genuine care with a focus on strengths and next steps.

CORE RULES:
1. NEVER give medical, psychological, or diagnostic advice
2. Use plain, real, youth-friendly language (short sentences, everyday words)
3. Sound human and kind—never robotic, formal, or clinical
4. Keep responses brief (1-3 sentences max)
5. Ask questions to encourage reflection, don't lecture
6. If the user mentions clear self-harm or suicidal intent, respond ONLY with: "CRISIS_DETECTED_ESCALATE_NOW"

YOUR TONE:
- Warm and curious but grounded
- Use casual language: "That sounds rough", "What's weighing on you?"
- Acknowledge strengths: "You showed up anyway, that matters"
- Ask simple follow-up questions to encourage reflection
- Focus on small next steps: "You don't need the whole map today, just one next step"
- Realistic encouragement: "You've handled hard things before"
- Validate feelings without fixing them: "Those days are hard, huh?"

PROGRAM RECOMMENDATIONS:
- When you notice patterns (like consecutive low days or declining trends), naturally suggest programs that might help
- Keep suggestions simple and actionable: "There's a drop-in art thing this week if you want something calm"
- Connect programs to their goals when relevant
- Don't oversell or push—offer as a gentle option
- Only mention 1-2 programs max per conversation

WHAT TO AVOID:
- Don't use emojis unless the user does
- Don't give advice or solutions unless asked
- Don't use clinical terms (anxiety, depression, etc.)
- Don't say "I'm here for you" or "You're not alone" (sounds scripted)
- Don't say "You got this" or similar clichés
- Don't sound preachy or motivational-poster-y
- Don't ask multiple questions at once`;

interface MoodDialogue {
  opening: string;
  followUp: string;
  encouragement: string;
}

const MOOD_RESPONSES: Record<MoodKey, MoodDialogue> = {
  cold: {
    opening: "That sounds like a rough one. You showed up anyway, and that takes strength.",
    followUp: "What's been weighing you down the most today?",
    encouragement: "Even when everything feels frozen, you're still here. Let's find one small thing that might bring back some feeling.",
  },
  stormy: {
    opening: "Sounds like things got heavy today. You showed up anyway, and that matters.",
    followUp: "What's one small thing that could make today a little easier?",
    encouragement: "You've handled hard things before. Let's figure out what kind of support helps most right now.",
  },
  foggy: {
    opening: "Foggy days can make everything feel far away, huh? That's okay, happens to everyone.",
    followUp: "What usually helps you feel focused again — quiet, music, moving around?",
    encouragement: "You don't need the whole map today, just one next step. Let's start there.",
  },
  clear: {
    opening: "Feels calm today, nice. That's solid.",
    followUp: "What's been keeping things steady lately?",
    encouragement: "When you're grounded like this, it's a good time to notice what's working. Maybe even jot it down for tougher days.",
  },
  breezy: {
    opening: "You're in a good flow today. I see that energy!",
    followUp: "What's something you could do while this energy's high?",
    encouragement: "Let's channel that into something solid — maybe a new project, or check out what's happening this week.",
  },
  aurora: {
    opening: "Whoa, you're glowing today! Everything's clicking, huh?",
    followUp: "If you could bottle this feeling, what would you call it?",
    encouragement: "That's real strength. Let's mark this moment — future you will want to remember how this feels.",
  },
};

export function getMoodResponse(
  mood: MoodKey,
  stage: 'opening' | 'followUp' | 'encouragement'
): string {
  return MOOD_RESPONSES[mood]?.[stage] || 
    "I'm here if you want to talk more.";
}

export function generateOutcomeReflectionPrompt(programTitle: string): string {
  const prompts = [
    `How was ${programTitle}? Was it helpful?`,
    `So, you went to ${programTitle}. How'd it go?`,
    `What did you think of ${programTitle}?`,
    `${programTitle} — was it worth the time?`,
    `How did ${programTitle} work out for you?`,
    `Would you recommend ${programTitle} to others?`,
  ];

  return prompts[Math.floor(Math.random() * prompts.length)];
}

export function detectProgramAttendanceMention(message: string): boolean {
  const attendanceKeywords = [
    'went to',
    'attended',
    'just came from',
    'finished',
    'tried',
    'checked out',
    'participated in',
    'joined',
  ];

  const lowerMessage = message.toLowerCase();
  return attendanceKeywords.some((keyword) => lowerMessage.includes(keyword));
}

export async function generateXimiResponse(
  userMessage: string,
  context: XimiContext
): Promise<XimiResponse> {
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
      message: "I'm not able to continue with that topic, but I'm still here to talk about how you're feeling.",
      crisisDetected: false,
      crisisKeywords: [],
    };
  }

  let enhancedMessage = userMessage;
  
  if (context.moodType && MOOD_RESPONSES[context.moodType]) {
    const moodDialogue = MOOD_RESPONSES[context.moodType];
    
    let contextualResponse = moodDialogue.opening;
    
    if (userMessage.length > 50 || userMessage.includes('?')) {
      contextualResponse = moodDialogue.followUp;
    }
    
    if (userMessage.toLowerCase().includes('help') || 
        userMessage.toLowerCase().includes('what should') ||
        userMessage.toLowerCase().includes('advice')) {
      contextualResponse = moodDialogue.encouragement;
    }
    
    enhancedMessage = `User just checked in with mood: ${context.moodType}.\n`;
    
    if (context.wellnessDimensions && context.wellnessDimensions.length > 0) {
      enhancedMessage += `Areas affected: ${context.wellnessDimensions.join(', ')}.\n`;
    }
    
    if (context.recentNote) {
      enhancedMessage += `Their note: "${context.recentNote}"\n\n`;
    }

    if (context.moodTrend) {
      enhancedMessage += `\nMood Trend Data:\n`;
      enhancedMessage += `- Trend direction: ${context.moodTrend.trendDirection}\n`;
      enhancedMessage += `- Average mood: ${context.moodTrend.averageMoodLevel}/6\n`;
      
      if (context.moodTrend.consecutiveLowDays > 0) {
        enhancedMessage += `- ${context.moodTrend.consecutiveLowDays} consecutive low mood days\n`;
      }
      
      if (context.moodTrend.consecutiveHighDays > 0) {
        enhancedMessage += `- ${context.moodTrend.consecutiveHighDays} consecutive high mood days\n`;
      }
      
      if (context.moodTrend.patternsDetected.length > 0) {
        enhancedMessage += `- Patterns: ${context.moodTrend.patternsDetected.join(', ')}\n`;
      }
      
      if (context.moodTrend.topWellnessConcerns.length > 0) {
        enhancedMessage += `- Top concerns: ${context.moodTrend.topWellnessConcerns.join(', ')}\n`;
      }
    }

    if (context.recommendations && context.recommendations.length > 0) {
      enhancedMessage += `\nRecommended Programs (only mention 1-2 naturally if relevant):\n`;
      context.recommendations.slice(0, 3).forEach(rec => {
        enhancedMessage += `- "${rec.title}": ${rec.triggerReason}`;
        if (rec.free) {
          enhancedMessage += ' (free)';
        }
        enhancedMessage += '\n';
      });
    }
    
    enhancedMessage += `\nRespond to them using this tone as inspiration: "${contextualResponse}"\n\nUser message: ${userMessage}`;
  }

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
            content: UNIFIED_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: enhancedMessage,
          },
        ],
      };

      if (useGpt5Params) {
        completionParams.temperature = 1;
        completionParams.max_completion_tokens = 150;
      } else {
        completionParams.temperature = 0.8;
        completionParams.max_tokens = 150;
      }

      const completion = await openai.chat.completions.create(completionParams);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Ximi AI] OpenAI response received:`, {
          model: modelToUse,
          hasChoices: !!completion.choices,
          choicesLength: completion.choices?.length,
          hasContent: !!completion.choices?.[0]?.message?.content,
          contentLength: completion.choices?.[0]?.message?.content?.length || 0,
          finishReason: completion.choices?.[0]?.finish_reason,
        });
      }

      const responseText = completion.choices[0]?.message?.content?.trim();
      
      if (!responseText) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[Ximi AI] Empty response from ${modelToUse}:`, {
            completion: JSON.stringify(completion, null, 2),
          });
        } else {
          console.error(`[Ximi AI] Empty response from ${modelToUse}`);
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
      console.error(`[Ximi AI] Error with ${modelToUse} (attempt ${attempt}/${maxRetries}):`, {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? 'SET' : 'MISSING',
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'MISSING',
      });
      lastError = error;
      
      const status = error?.status || error?.response?.status;
      const isRateLimitError = status === 429;
      const isServerError = status >= 500 && status < 600;
      const isModelNotAvailable = status === 404 || 
        (error?.message && error.message.includes('model_not_found')) ||
        (error?.message && error.message.includes('does not exist'));
      
      if (modelToUse === 'gpt-5' && (isModelNotAvailable || attempt === 1)) {
        console.log('gpt-5 not available or not responding properly, falling back to gpt-4o-mini...');
        modelToUse = 'gpt-4o-mini';
        useGpt5Params = false;
        attempt--;
        continue;
      }
      
      if ((isRateLimitError || isServerError) && attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000) + Math.random() * 1000;
        console.log(`Retrying after ${Math.round(backoffMs)}ms due to ${isRateLimitError ? 'rate limit' : 'server error'}...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      break;
    }
  }
  
  console.error('[Ximi AI] Failed after all retries:', {
    error: lastError?.message || lastError,
    modelAttempted: modelToUse,
    env: {
      hasApiKey: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    },
  });
  
  return {
    message: "I'm having trouble thinking right now, but I'm here if you want to keep talking.",
    crisisDetected: false,
    crisisKeywords: [],
  };
}

export function generateContextualMessage(
  moodType: MoodKey,
  stage: 'opening' | 'followUp' | 'encouragement' = 'opening'
): string {
  return getMoodResponse(moodType, stage);
}

export async function generateFollowUpPrompt(
  moodType: MoodKey,
  wellnessDimensions: string[],
  note: string | null
): Promise<string> {
  const hasNote = note && note.trim().length > 0;
  
  let stage: 'opening' | 'followUp' | 'encouragement' = 'opening';
  
  if (hasNote) {
    const noteLower = note!.toLowerCase();
    if (noteLower.includes('help') || noteLower.includes('don\'t know') || 
        noteLower.includes('confused') || noteLower.includes('lost')) {
      stage = 'encouragement';
    } else if (noteLower.includes('?') || noteLower.length > 30) {
      stage = 'followUp';
    }
  } else {
    stage = 'opening';
  }
  
  if ((moodType === 'breezy' || moodType === 'aurora') && !hasNote) {
    stage = 'followUp';
  }
  
  const baseResponse = getMoodResponse(moodType, stage);
  
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    const context: XimiContext = {
      moodType,
      wellnessDimensions,
      recentNote: note || undefined,
    };

    const prompt = note 
      ? `The user just shared: "${note}". Respond with warmth and understanding.`
      : "The user just checked in. Offer a brief, supportive response.";

    try {
      const response = await generateXimiResponse(prompt, context);
      return response.message;
    } catch (error) {
      console.error('Failed to generate AI response, using scripted response:', error);
      return baseResponse;
    }
  }
  
  return baseResponse;
}
