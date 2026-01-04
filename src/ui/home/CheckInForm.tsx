import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { addToQueue } from '@/lib/queue';
import api from '@/lib/api';
import { useSession } from '@/lib/session';
import { MOODS, type MoodKey } from '@/lib/moodConfig';
import { WELLNESS_DIMENSIONS, type WellnessDimensionKey } from '@/lib/wellnessConfig';
import useFocusTrap from '@/hooks/useFocusTrap';

interface CheckInFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const affectOptions = [
  'grateful', 'hopeful', 'excited', 'peaceful', 'creative', 'confident',
  'tired', 'stressed', 'overwhelmed', 'lonely', 'frustrated', 'anxious',
  'curious', 'motivated', 'content', 'restless', 'focused', 'social'
];

export default function CheckInForm({ isOpen, onClose, onSuccess }: CheckInFormProps) {
  const { needsGuardianVerification } = useSession();
  const [step, setStep] = useState(1);
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [selectedDimensions, setSelectedDimensions] = useState<WellnessDimensionKey[]>([]);
  const [selectedAffects, setSelectedAffects] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const focusTrapRef = useFocusTrap(isOpen);

  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      handleClose();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscapeKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMood) return;
    
    setIsSubmitting(true);
    
    try {
      const moodConfig = MOODS.find(m => m.key === selectedMood);
      const checkInData = {
        timestamp: new Date().toISOString(),
        dimension: 'mood',
        moodLevel16: moodConfig?.score || 4,
        moodType: selectedMood,
        wellnessDimensions: selectedDimensions,
        affectTags: selectedAffects,
        note: note.trim() || undefined,
        localTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      
      // Try to submit immediately if online
      if (navigator.onLine) {
        try {
          const { error } = await api.checkins.create(checkInData);
          if (error) {
            throw new Error(error);
          }
        } catch (error) {
          // If immediate submission fails, queue it
          await addToQueue('checkin', checkInData);
        }
      } else {
        // Offline - queue the check-in
        await addToQueue('checkin', checkInData);
      }
      
      // Reset form
      setStep(1);
      setSelectedMood(null);
      setSelectedDimensions([]);
      setSelectedAffects([]);
      setNote('');
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error submitting check-in:', error);
      // Could show an error toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDimension = (dimension: WellnessDimensionKey) => {
    setSelectedDimensions(prev => {
      if (prev.includes(dimension)) {
        return prev.filter(d => d !== dimension);
      }
      // Limit to 3 dimensions max
      if (prev.length >= 3) {
        return [...prev.slice(1), dimension];
      }
      return [...prev, dimension];
    });
  };

  const toggleAffect = (affect: string) => {
    setSelectedAffects(prev => 
      prev.includes(affect) 
        ? prev.filter(a => a !== affect)
        : [...prev, affect]
    );
  };

  const handleClose = () => {
    setStep(1);
    setSelectedMood(null);
    setSelectedDimensions([]);
    setSelectedAffects([]);
    setNote('');
    onClose();
  };

  const canProceedToStep2 = selectedMood !== null;
  const canProceedToStep3 = selectedDimensions.length > 0 && selectedDimensions.length <= 3;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
          className="cosmic-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />
        
        {/* Sheet */}
        <motion.div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkin-form-title"
          className="cosmic-sheet max-h-[90vh] flex flex-col"
          initial={{ transform: 'translateY(100%)' }}
          animate={{ transform: 'translateY(0)' }}
          exit={{ transform: 'translateY(100%)' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
            {/* Guardian Verification Banner */}
            {needsGuardianVerification && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4"
              >
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 mb-1">
                      Guardian Verification Required
                    </h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      To start checking in, a parent or guardian needs to verify your account. 
                      They should have received a verification email. Check-ins will be available once verified.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="w-5 h-5 text-textSecondaryLight" aria-hidden="true" />
                  </button>
                )}
                <div>
                  <h2 id="checkin-form-title" className="text-xl font-display font-semibold text-deepSage">
                    {step === 1 && "How are you feeling?"}
                    {step === 2 && "What's affected?"}
                    {step === 3 && "Anything to add?"}
                  </h2>
                  <p className="text-sm text-textSecondaryLight" aria-live="polite">
                    Step {step} of 3
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                aria-label="Close check-in form"
              >
                <X className="w-5 h-5 text-textSecondaryLight" aria-hidden="true" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6" aria-label="Mood check-in form">
              {/* Step 1: Mood Selection */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  <fieldset>
                    <legend className="block text-sm font-medium text-deepSage mb-3">
                      Choose your mood level
                    </legend>
                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Mood options">
                    {MOODS.map((mood) => {
                      const Icon = mood.icon;
                      return (
                        <motion.button
                          key={mood.key}
                          type="button"
                          role="radio"
                          aria-checked={selectedMood === mood.key}
                          aria-label={`${mood.label}: ${mood.desc}`}
                          onClick={() => setSelectedMood(mood.key)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            selectedMood === mood.key
                              ? 'border-teal bg-teal/10 shadow-glow-teal'
                              : 'border-borderMutedLight bg-surface hover:border-sage'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="w-8 h-8 flex-shrink-0" style={{ color: `hsl(${mood.color.h}, ${mood.color.s}%, ${mood.color.l}%)` }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-semibold text-deepSage flex items-center space-x-2">
                                <span>{mood.emoji}</span>
                                <span>{mood.label}</span>
                              </div>
                              <div className="text-xs text-textSecondaryLight mt-1">
                                {mood.desc}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                    </div>
                  </fieldset>
                  
                  <motion.button
                    type="button"
                    disabled={!canProceedToStep2}
                    onClick={() => setStep(2)}
                    aria-label="Continue to step 2: wellness dimensions"
                    className={`w-full cosmic-button flex items-center justify-center space-x-2 ${
                      !canProceedToStep2 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    whileHover={canProceedToStep2 ? { scale: 1.02 } : {}}
                    whileTap={canProceedToStep2 ? { scale: 0.98 } : {}}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </motion.button>
                </motion.div>
              )}
              
              {/* Step 2: Wellness Dimensions */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  <fieldset>
                    <legend className="block text-sm font-medium text-deepSage mb-3">
                      Pick 1-3 areas of your life that are affecting your mood right now
                    </legend>
                    <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wellness dimensions">
                      {WELLNESS_DIMENSIONS.map((dimension) => (
                        <motion.button
                          key={dimension.key}
                          type="button"
                          aria-pressed={selectedDimensions.includes(dimension.key)}
                          aria-label={`${dimension.label}: ${dimension.description}`}
                          onClick={() => toggleDimension(dimension.key)}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                            selectedDimensions.includes(dimension.key)
                              ? 'border-teal bg-teal/10 shadow-glow-teal'
                              : 'border-borderMutedLight bg-surface hover:border-sage'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                        <div className="text-2xl mb-1">{dimension.emoji}</div>
                        <div className="text-sm font-semibold text-deepSage">
                          {dimension.label}
                        </div>
                        <div className="text-xs text-textSecondaryLight mt-1">
                          {dimension.description}
                        </div>
                        </motion.button>
                      ))}
                    </div>
                  </fieldset>
                  
                  {selectedDimensions.length > 0 && (
                    <div className="text-xs text-textSecondaryLight text-center" aria-live="polite">
                      {selectedDimensions.length} of 3 selected
                    </div>
                  )}
                  
                  <motion.button
                    type="button"
                    disabled={!canProceedToStep3}
                    onClick={() => setStep(3)}
                    aria-label="Continue to step 3: add notes"
                    className={`w-full cosmic-button flex items-center justify-center space-x-2 ${
                      !canProceedToStep3 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    whileHover={canProceedToStep3 ? { scale: 1.02 } : {}}
                    whileTap={canProceedToStep3 ? { scale: 0.98 } : {}}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </motion.button>
                </motion.div>
              )}
              
              {/* Step 3: Note + Affect Tags + Submit */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Affect Tags */}
                  <fieldset className="space-y-3">
                    <legend className="block text-sm font-medium text-deepSage">
                      What else are you feeling? (optional)
                    </legend>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto" role="group" aria-label="Affect options">
                      {affectOptions.map(affect => (
                        <motion.button
                          key={affect}
                          type="button"
                          aria-pressed={selectedAffects.includes(affect)}
                          onClick={() => toggleAffect(affect)}
                          className={`cosmic-chip ${
                            selectedAffects.includes(affect) ? 'selected' : ''
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {affect}
                        </motion.button>
                      ))}
                    </div>
                  </fieldset>
                  
                  {/* Note */}
                  <div className="space-y-3">
                    <label htmlFor="note" className="block text-sm font-medium text-deepSage">
                      Add a note (optional, max 140 characters)
                    </label>
                    <textarea
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={140}
                      rows={3}
                      className="cosmic-input resize-none"
                      placeholder="What's on your mind today?"
                    />
                    <div className="text-xs text-textSecondaryLight text-right">
                      {note.length}/140
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || needsGuardianVerification}
                    className={`w-full cosmic-button ${
                      isSubmitting || needsGuardianVerification ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    whileHover={!isSubmitting && !needsGuardianVerification ? { scale: 1.02 } : {}}
                    whileTap={!isSubmitting && !needsGuardianVerification ? { scale: 0.98 } : {}}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-deepSage border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : needsGuardianVerification ? (
                      'Guardian Verification Required'
                    ) : (
                      'Save Check-in'
                    )}
                  </motion.button>
                  
                  {/* Offline indicator */}
                  {!navigator.onLine && (
                    <div className="text-center text-sm text-textSecondaryLight bg-sage/10 p-3 rounded-lg">
                      You're offline. Your check-in will be saved and synced when you're back online.
                    </div>
                  )}
                </motion.div>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
