import { useState, useCallback } from 'react';

// Crisis keywords that trigger detection
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'end my life',
  'self-harm', 'cut myself', 'hurt myself', 'cutting',
  'overdose', 'pills', 'poison',
  'no one cares', 'everyone hates me', 'better off dead',
  "don't want to live", 'want to die', 'wish I was dead',
  'hopeless', 'worthless', 'nothing matters',
];

export function useCrisisDetection() {
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);

  const checkForCrisis = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    const foundKeywords = CRISIS_KEYWORDS.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      setCrisisDetected(true);
      setDetectedKeywords(foundKeywords);
      return true;
    }
    
    return false;
  }, []);

  const resetCrisisDetection = useCallback(() => {
    setCrisisDetected(false);
    setDetectedKeywords([]);
  }, []);

  return {
    crisisDetected,
    detectedKeywords,
    checkForCrisis,
    resetCrisisDetection,
  };
}
