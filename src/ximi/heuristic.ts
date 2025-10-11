/**
 * Ximi Heuristic AI System
 * 
 * This is a local, rule-based AI system that provides basic conversational
 * capabilities and crisis detection without requiring external API calls.
 * It's designed to be safe, predictable, and privacy-preserving.
 */

export interface MessageAnalysis {
  category: 'crisis' | 'programs' | 'mood' | 'support' | 'greeting' | 'general';
  isCrisis: boolean;
  confidence: number;
  keywords: string[];
}

// Crisis keywords that should trigger immediate support
const CRISIS_KEYWORDS = [
  // Direct crisis terms
  'suicide', 'kill myself', 'end my life', 'want to die', 'better off dead',
  'hurt myself', 'self harm', 'cut myself', 'overdose', 'end it all',
  
  // Severe distress indicators
  'can\'t go on', 'no point', 'hopeless', 'worthless', 'nobody cares',
  'give up', 'can\'t take it', 'too much pain', 'nothing matters',
  
  // Emergency situations
  'emergency', 'crisis', 'help me', 'scared', 'danger', 'unsafe'
];

// Program-related keywords
const PROGRAM_KEYWORDS = [
  'program', 'programs', 'activity', 'activities', 'event', 'events',
  'class', 'classes', 'workshop', 'workshops', 'group', 'groups',
  'art', 'arts', 'music', 'sports', 'fitness', 'creative', 'learning',
  'volunteer', 'volunteering', 'community', 'social', 'meet people',
  'find', 'looking for', 'search', 'explore', 'discover'
];

// Mood-related keywords
const MOOD_KEYWORDS = [
  'mood', 'feeling', 'feelings', 'emotion', 'emotions', 'sad', 'happy',
  'angry', 'anxious', 'depressed', 'stressed', 'worried', 'excited',
  'calm', 'peaceful', 'frustrated', 'overwhelmed', 'tired', 'energetic',
  'check in', 'check-in', 'how am i', 'how i feel', 'track'
];

// Support-related keywords
const SUPPORT_KEYWORDS = [
  'support', 'help', 'talk', 'listen', 'advice', 'guidance', 'counseling',
  'therapy', 'therapist', 'counselor', 'mental health', 'wellbeing',
  'resources', 'services', 'assistance', 'someone to talk to'
];

// Greeting keywords
const GREETING_KEYWORDS = [
  'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
  'what\'s up', 'how are you', 'nice to meet you', 'greetings'
];

/**
 * Analyze a user message and categorize it
 */
export function analyzeMessage(message: string): MessageAnalysis {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Check for crisis keywords first (highest priority)
  const crisisMatches = CRISIS_KEYWORDS.filter(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  if (crisisMatches.length > 0) {
    return {
      category: 'crisis',
      isCrisis: true,
      confidence: 0.95,
      keywords: crisisMatches
    };
  }
  
  // Check other categories
  const programMatches = PROGRAM_KEYWORDS.filter(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  const moodMatches = MOOD_KEYWORDS.filter(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  const supportMatches = SUPPORT_KEYWORDS.filter(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  const greetingMatches = GREETING_KEYWORDS.filter(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  // Determine the primary category based on matches
  const categories = [
    { name: 'programs' as const, matches: programMatches },
    { name: 'mood' as const, matches: moodMatches },
    { name: 'support' as const, matches: supportMatches },
    { name: 'greeting' as const, matches: greetingMatches }
  ];
  
  // Find the category with the most matches
  const primaryCategory = categories.reduce((prev, current) => 
    current.matches.length > prev.matches.length ? current : prev
  );
  
  if (primaryCategory.matches.length > 0) {
    return {
      category: primaryCategory.name,
      isCrisis: false,
      confidence: Math.min(0.8, primaryCategory.matches.length * 0.2),
      keywords: primaryCategory.matches
    };
  }
  
  // Default to general category
  return {
    category: 'general',
    isCrisis: false,
    confidence: 0.3,
    keywords: []
  };
}

/**
 * Generate a contextual response based on message analysis
 */
export function generateResponse(analysis: MessageAnalysis, userMessage: string): string {
  if (analysis.isCrisis) {
    return "I'm concerned about what you've shared. Let me connect you with immediate support resources that can help.";
  }
  
  switch (analysis.category) {
    case 'programs':
      return "I can help you find programs! Based on what you're looking for, I'd recommend checking out the Programs tab where you can filter by your interests. Would you like me to suggest some specific categories?";
      
    case 'mood':
      return "It sounds like you're thinking about your mood or feelings. The mood check-in feature on the Home tab is a great way to track how you're doing. Have you tried checking in today?";
      
    case 'support':
      return "I'm here to support you. If you're looking for resources or someone to talk to, there are several options available. Would you like me to share some support resources?";
      
    case 'greeting':
      return "Hello! It's great to meet you. I'm here to help you navigate the app and find what you need. Is there something specific you'd like to explore?";
      
    default:
      return "That's interesting! I'm still learning, but I'm here to help however I can. You might find what you're looking for in the Explore section, or feel free to ask me anything else.";
  }
}

/**
 * Check if a message contains crisis indicators
 * This is a standalone function for quick crisis detection
 */
export function containsCrisisIndicators(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();
  return CRISIS_KEYWORDS.some(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
}

/**
 * Get suggested follow-up questions based on the conversation context
 */
export function getSuggestedQuestions(analysis: MessageAnalysis): string[] {
  switch (analysis.category) {
    case 'programs':
      return [
        "What kind of activities interest you?",
        "Are you looking for free programs?",
        "Do you prefer indoor or outdoor activities?"
      ];
      
    case 'mood':
      return [
        "How are you feeling today?",
        "Would you like to do a mood check-in?",
        "What affects your mood the most?"
      ];
      
    case 'support':
      return [
        "What kind of support are you looking for?",
        "Would you like to see crisis resources?",
        "Are you looking for someone to talk to?"
      ];
      
    default:
      return [
        "How can I help you today?",
        "What would you like to explore?",
        "Tell me more about what you're looking for."
      ];
  }
}
