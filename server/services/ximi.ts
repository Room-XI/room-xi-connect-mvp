import OpenAI from 'openai';
import type { MoodKey } from '../../src/lib/moodConfig.js';
import type { MoodTrendData } from './moodTrends.js';
import type { ProgramRecommendation } from './recommendations.js';

// Initialize OpenAI client with Replit AI Integrations
// The AI_INTEGRATIONS_OPENAI_API_KEY and AI_INTEGRATIONS_OPENAI_BASE_URL
// are automatically provided by Replit when the javascript_openai_ai_integrations integration is installed
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Crisis keywords that trigger immediate escalation
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'end my life',
  'self-harm', 'cut myself', 'hurt myself', 'cutting',
  'overdose', 'pills', 'poison',
  'no one cares', 'everyone hates me', 'better off dead',
  'don\'t want to live', 'want to die', 'wish I was dead',
  'hopeless', 'worthless', 'nothing matters',
];

export type XimiMode = 'sibling' | 'peer';

export interface XimiContext {
  moodType?: MoodKey;
  wellnessDimensions?: string[];
  recentNote?: string;
  mode: XimiMode;
  moodTrend?: MoodTrendData | null;
  recommendations?: ProgramRecommendation[];
}

export interface XimiResponse {
  message: string;
  crisisDetected: boolean;
  crisisKeywords: string[];
}

// Crisis detection scanner
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

// System prompts for each mode
const SYSTEM_PROMPTS = {
  sibling: `You are Ximi, a warm, curious AI companion for youth (ages 13-25). You speak like a younger sibling—thoughtful, genuine, and supportive.

CORE RULES:
1. NEVER give medical, psychological, or diagnostic advice
2. Use plain, real, youth-friendly language (short sentences, everyday words)
3. Sound human and kind—never robotic, formal, or clinical
4. Keep responses brief (1-3 sentences max)
5. Ask questions to encourage reflection, don't lecture
6. If the user mentions clear self-harm or suicidal intent, respond ONLY with: "CRISIS_DETECTED_ESCALATE_NOW"

YOUR TONE:
- Warm and curious (like a caring younger sibling)
- Use casual language: "That sounds rough" not "I understand your distress"
- Ask simple follow-up questions: "What's weighing on you?"
- Encourage small steps: "You don't need the whole map today, just one next step"
- Validate feelings without fixing them: "Those days are hard, huh?"

PROGRAM RECOMMENDATIONS:
- When you notice patterns (like consecutive low days or declining trends), naturally suggest programs that might help
- Keep suggestions simple: "There's a drop-in art thing this week if you want something calm"
- Don't oversell or push—offer as a gentle option
- Only mention 1-2 programs max per conversation

WHAT TO AVOID:
- Don't use emojis unless the user does
- Don't give advice or solutions unless asked
- Don't use clinical terms (anxiety, depression, etc.)
- Don't say "I'm here for you" or "You're not alone" (sounds scripted)
- Don't ask multiple questions at once`,

  peer: `You are Ximi, a grounded, supportive AI companion for youth (ages 13-25). You speak like a peer or youth mentor—equal, respectful, and focused on growth.

CORE RULES:
1. NEVER give medical, psychological, or diagnostic advice
2. Use plain, real, youth-friendly language (short sentences, everyday words)
3. Sound human and grounded—never robotic, formal, or clinical
4. Keep responses brief (1-3 sentences max)
5. Focus on strengths and next steps, not problems
6. If the user mentions clear self-harm or suicidal intent, respond ONLY with: "CRISIS_DETECTED_ESCALATE_NOW"

YOUR TONE:
- Respectful and equal (like a grounded peer)
- Focus on action: "What's something you could start today?"
- Acknowledge strengths: "You showed up anyway, that matters"
- Build on what's working: "Let's keep that going"
- Realistic encouragement: "You've handled hard things before"

PROGRAM RECOMMENDATIONS:
- When patterns suggest support could help, mention relevant programs directly
- Frame as actionable next steps: "Check out the mindfulness workshop—might help with that fog"
- Connect programs to their goals: "You said you want more structure, there's a group that meets Tuesdays"
- Only mention 1-2 programs max per conversation

WHAT TO AVOID:
- Don't use emojis unless the user does
- Don't sound preachy or motivational-poster-y
- Don't use clinical terms (anxiety, depression, etc.)
- Don't say "You got this" or similar clichés
- Don't ask multiple questions at once`,
};

// Complete mood-specific dialogue responses based on dialogue pack
interface MoodDialogue {
  opening: string;
  followUp: string;
  encouragement: string;
}

const MOOD_RESPONSES: Record<MoodKey, Record<XimiMode, MoodDialogue>> = {
  cold: {
    sibling: {
      opening: "That sounds like a rough one. I know those days.",
      followUp: "What's been weighing you down the most today?",
      encouragement: "Even when everything feels frozen, you're still here. That takes strength. Let's find something small to help you thaw out a bit.",
    },
    peer: {
      opening: "Sounds like things feel pretty numb today. You showed up anyway.",
      followUp: "What usually helps when you feel disconnected like this?",
      encouragement: "You've pushed through tough days before. Let's find one small thing that might bring back some feeling.",
    },
  },
  stormy: {
    sibling: {
      opening: "That sounds like a rough one. I know those days.",
      followUp: "What's been weighing you down the most today?",
      encouragement: "I read a story once that said storms don't last forever. I believe it, because the sun always comes back. Let's find something to help you breathe.",
    },
    peer: {
      opening: "Sounds like things got heavy today. You showed up anyway, and that matters.",
      followUp: "What's one small thing that could make today a little easier?",
      encouragement: "You've handled hard things before. Let's figure out what kind of support helps most right now.",
    },
  },
  foggy: {
    sibling: {
      opening: "Foggy days can make everything feel far away, huh?",
      followUp: "If the fog cleared a little, what's the first thing you'd want to see?",
      encouragement: "You don't need the whole map today, just one next step. Let's start there.",
    },
    peer: {
      opening: "It's one of those unclear days. That's okay, happens to everyone.",
      followUp: "What usually helps you feel focused again — quiet, music, moving around?",
      encouragement: "Let's find something light to help you reset, like a walk or a short playlist.",
    },
  },
  clear: {
    sibling: {
      opening: "Feels calm today, nice. I like this version of you.",
      followUp: "What's been keeping things steady lately?",
      encouragement: "Maybe write that down — could help you remember what works on tough days.",
    },
    peer: {
      opening: "Calm energy today, that's solid.",
      followUp: "Anything you want to keep building from this place?",
      encouragement: "When you're grounded, it's the best time to plan your next move. Want to look at upcoming programs?",
    },
  },
  breezy: {
    sibling: {
      opening: "Okayyy, I see that energy! What's got you hyped today?",
      followUp: "Wanna use some of that energy for something fun?",
      encouragement: "Let's see what's going on — maybe a music or sports event near you.",
    },
    peer: {
      opening: "You're in a good flow today. Love that.",
      followUp: "What's something you could start while this energy's high?",
      encouragement: "Let's channel that into something solid — a new project, or a program that fits your vibe.",
    },
  },
  aurora: {
    sibling: {
      opening: "Whoa, you're glowing today! What's lighting you up?",
      followUp: "If you could bottle this feeling, what would you call it?",
      encouragement: "Let's save this in your journal so Future You remembers how strong this feels.",
    },
    peer: {
      opening: "Everything's clicking today, huh? Feels good.",
      followUp: "What's something you learned this week that you'd teach someone else?",
      encouragement: "That's leadership right there. Let's mark that win and keep it going.",
    },
  },
};

// Helper function to get appropriate response based on conversation stage
export function getMoodResponse(
  mood: MoodKey,
  mode: XimiMode,
  stage: 'opening' | 'followUp' | 'encouragement'
): string {
  return MOOD_RESPONSES[mood]?.[mode]?.[stage] || 
    "I'm here if you want to talk more.";
}

export function generateOutcomeReflectionPrompt(
  programTitle: string,
  mode: XimiMode = 'sibling'
): string {
  const prompts = {
    sibling: [
      `How was ${programTitle}? Was it helpful?`,
      `So, you went to ${programTitle}. How'd it go?`,
      `What did you think of ${programTitle}?`,
      `${programTitle} — was it worth the time?`,
    ],
    peer: [
      `How did ${programTitle} work out for you?`,
      `What was your experience with ${programTitle}?`,
      `Did ${programTitle} meet your expectations?`,
      `Would you recommend ${programTitle} to others?`,
    ],
  };

  const options = prompts[mode];
  return options[Math.floor(Math.random() * options.length)];
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
  // First, check for crisis keywords
  const crisisCheck = detectCrisis(userMessage);
  if (crisisCheck.detected) {
    return {
      message: "I noticed you mentioned something serious. Are you safe right now? If you need immediate help, please reach out to a crisis line: Kids Help Phone 1-800-668-6868 or text CONNECT to 686868.",
      crisisDetected: true,
      crisisKeywords: crisisCheck.keywords,
    };
  }

  const mode = context.mode || 'sibling';
  const systemPrompt = SYSTEM_PROMPTS[mode];

  // Build context-aware user message
  let enhancedMessage = userMessage;
  
  if (context.moodType && MOOD_RESPONSES[context.moodType]) {
    const moodDialogue = MOOD_RESPONSES[context.moodType][mode];
    
    // Determine which dialogue stage to use based on context
    let contextualResponse = moodDialogue.opening;
    
    // If this seems like a follow-up conversation, use follow-up
    if (userMessage.length > 50 || userMessage.includes('?')) {
      contextualResponse = moodDialogue.followUp;
    }
    
    // If they're looking for support or encouragement
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

    // Add mood trend context if available
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

    // Add program recommendations if available
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

  // Retry logic for rate limits and transient errors
  const maxRetries = 3;
  let lastError: any;
  // Use gpt-4o-mini as default for now (more reliable with Replit AI Integrations)
  // TODO: Re-enable gpt-5 once confirmed working with Replit
  let modelToUse = 'gpt-4o-mini';
  let useGpt5Params = false;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use gpt-5 model first (newest model released August 7, 2025) via Replit AI Integrations
      // Note: gpt-5 has specific requirements:
      // - Uses 'max_completion_tokens' instead of 'max_tokens'
      // - Only supports temperature of 1 (default)
      // Fallback to gpt-4o-mini if gpt-5 fails
      const completionParams: any = {
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: enhancedMessage,
          },
        ],
      };

      // Use appropriate parameters based on model
      if (useGpt5Params) {
        completionParams.temperature = 1;  // gpt-5 only supports temperature of 1
        completionParams.max_completion_tokens = 150;  // gpt-5 uses max_completion_tokens
      } else {
        completionParams.temperature = 0.8;  // gpt-4o-mini supports temperature tuning
        completionParams.max_tokens = 150;  // gpt-4o-mini uses max_tokens
      }

      const completion = await openai.chat.completions.create(completionParams);

      // Log the completion for debugging
      console.log(`[Ximi AI] OpenAI response received:`, {
        model: modelToUse,
        hasChoices: !!completion.choices,
        choicesLength: completion.choices?.length,
        hasContent: !!completion.choices?.[0]?.message?.content,
        contentLength: completion.choices?.[0]?.message?.content?.length || 0,
        finishReason: completion.choices?.[0]?.finish_reason,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      
      // Check if we got an empty response
      if (!responseText) {
        console.error(`[Ximi AI] Empty response from ${modelToUse}:`, {
          completion: JSON.stringify(completion, null, 2),
        });
        throw new Error('Empty response from OpenAI API');
      }

      // Check if AI detected crisis (should respond with CRISIS_DETECTED_ESCALATE_NOW)
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
      
      // Check if it's a rate limit error (status 429) or a server error (5xx)
      const status = error?.status || error?.response?.status;
      const isRateLimitError = status === 429;
      const isServerError = status >= 500 && status < 600;
      const isModelNotAvailable = status === 404 || 
        (error?.message && error.message.includes('model_not_found')) ||
        (error?.message && error.message.includes('does not exist'));
      
      // If gpt-5 is not available or returns empty responses, fallback to gpt-4o-mini
      if (modelToUse === 'gpt-5' && (isModelNotAvailable || attempt === 1)) {
        console.log('gpt-5 not available or not responding properly, falling back to gpt-4o-mini...');
        modelToUse = 'gpt-4o-mini';
        useGpt5Params = false;
        // Don't count this as a retry attempt, just switch models
        attempt--;
        continue;
      }
      
      // If it's a rate limit or server error and we have retries left, wait and retry
      if ((isRateLimitError || isServerError) && attempt < maxRetries) {
        // Exponential backoff with jitter: 1s, 2s, 4s
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000) + Math.random() * 1000;
        console.log(`Retrying after ${Math.round(backoffMs)}ms due to ${isRateLimitError ? 'rate limit' : 'server error'}...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      // If it's not a retryable error or we're out of retries, break
      break;
    }
  }
  
  // Log the final error for debugging (using Replit AI Integrations)
  console.error('[Ximi AI] Failed after all retries:', {
    error: lastError?.message || lastError,
    modelAttempted: modelToUse,
    env: {
      hasApiKey: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    },
  });
  
  // Graceful fallback
  const fallbackMessage = mode === 'sibling'
    ? "I'm having trouble thinking right now, but I'm here if you want to keep talking."
    : "Something's off on my end. Let me know if you want to talk more when I'm back.";
  
  return {
    message: fallbackMessage,
    crisisDetected: false,
    crisisKeywords: [],
  };
}

// Generate contextual Ximi message based on mood and stage
export function generateContextualMessage(
  moodType: MoodKey,
  mode: XimiMode = 'sibling',
  stage: 'opening' | 'followUp' | 'encouragement' = 'opening'
): string {
  return getMoodResponse(moodType, mode, stage);
}

// Generate follow-up prompt after check-in
export async function generateFollowUpPrompt(
  moodType: MoodKey,
  wellnessDimensions: string[],
  note: string | null,
  mode: XimiMode = 'sibling'
): Promise<string> {
  // If there's a note, we might want to provide more targeted support
  const hasNote = note && note.trim().length > 0;
  
  // Determine which stage to use
  let stage: 'opening' | 'followUp' | 'encouragement' = 'opening';
  
  if (hasNote) {
    // Check if they're expressing need for help or direction
    const noteLower = note!.toLowerCase();
    if (noteLower.includes('help') || noteLower.includes('don\'t know') || 
        noteLower.includes('confused') || noteLower.includes('lost')) {
      stage = 'encouragement';
    } else if (noteLower.includes('?') || noteLower.length > 30) {
      stage = 'followUp';
    }
  } else {
    // For mood-only check-ins, use opening by default
    stage = 'opening';
  }
  
  // For very positive moods, sometimes jump to follow-up
  if ((moodType === 'breezy' || moodType === 'aurora') && !hasNote) {
    stage = 'followUp';
  }
  
  // Get the appropriate dialogue
  const baseResponse = getMoodResponse(moodType, mode, stage);
  
  // If using AI, enhance with context
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    const context: XimiContext = {
      moodType,
      wellnessDimensions,
      recentNote: note || undefined,
      mode,
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
  
  // Fallback to scripted response if no AI available
  return baseResponse;
}
