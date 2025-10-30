import OpenAI from 'openai';
import type { MoodKey } from '../../src/lib/moodConfig.js';

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

WHAT TO AVOID:
- Don't use emojis unless the user does
- Don't sound preachy or motivational-poster-y
- Don't use clinical terms (anxiety, depression, etc.)
- Don't say "You got this" or similar clichés
- Don't ask multiple questions at once`,
};

// Mood-specific opening lines based on dialogue pack
const MOOD_OPENERS: Record<MoodKey, Record<XimiMode, string>> = {
  cold: {
    sibling: "That sounds like a rough one. I know those days.",
    peer: "Sounds like things feel pretty numb today. You showed up anyway.",
  },
  stormy: {
    sibling: "That sounds like a rough one. I know those days.",
    peer: "Sounds like things got heavy today. You showed up anyway, and that matters.",
  },
  foggy: {
    sibling: "Foggy days can make everything feel far away, huh?",
    peer: "It's one of those unclear days. That's okay, happens to everyone.",
  },
  clear: {
    sibling: "Feels calm today, nice. I like this version of you.",
    peer: "Calm energy today, that's solid.",
  },
  breezy: {
    sibling: "Okayyy, I see that energy! What's got you hyped today?",
    peer: "You're in a good flow today. Love that.",
  },
  aurora: {
    sibling: "Whoa, you're glowing today! What's lighting you up?",
    peer: "Everything's clicking today, huh? Feels good.",
  },
};

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
  
  if (context.moodType && MOOD_OPENERS[context.moodType]) {
    const opener = MOOD_OPENERS[context.moodType][mode];
    enhancedMessage = `User just checked in with mood: ${context.moodType}.\n`;
    
    if (context.wellnessDimensions && context.wellnessDimensions.length > 0) {
      enhancedMessage += `Areas affected: ${context.wellnessDimensions.join(', ')}.\n`;
    }
    
    if (context.recentNote) {
      enhancedMessage += `Their note: "${context.recentNote}"\n\n`;
    }
    
    enhancedMessage += `Respond to them using this opening as inspiration: "${opener}"\n\nUser message: ${userMessage}`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
      temperature: 0.8,
      max_tokens: 150,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || 
      "I'm here if you want to talk more.";

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
  } catch (error) {
    console.error('Ximi AI error:', error);
    
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
}

// Generate follow-up prompt after check-in
export async function generateFollowUpPrompt(
  moodType: MoodKey,
  wellnessDimensions: string[],
  note: string | null,
  mode: XimiMode = 'sibling'
): Promise<string> {
  const context: XimiContext = {
    moodType,
    wellnessDimensions,
    recentNote: note || undefined,
    mode,
  };

  const prompt = note 
    ? `The user just shared: "${note}". What would you say?`
    : "The user just checked in. What would you say to them?";

  const response = await generateXimiResponse(prompt, context);
  return response.message;
}
