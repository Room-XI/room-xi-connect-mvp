import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { addToQueue } from '@/lib/queue';
import api from '@/lib/api';
import { MOODS, type MoodKey } from '@/lib/moodConfig';
import { WELLNESS_DIMENSIONS, type WellnessDimensionKey } from '@/lib/wellnessConfig';

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
  const [step, setStep] = useState(1);
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [selectedDimensions, setSelectedDimensions] = useState<WellnessDimensionKey[]>([]);
  const [selectedAffects, setSelectedAffects] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          console.log('Immediate submission failed, queuing for later:', error);
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
          className="cosmic-sheet"
          initial={{ transform: 'translateY(100%)' }}
          animate={{ transform: 'translateY(0)' }}
          exit={{ transform: 'translateY(100%)' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="w-5 h-5 text-textSecondaryLight" />
                  </button>
                )}
                <div>
                  <h2 className="text-xl font-display font-semibold text-deepSage">
                    {step === 1 && "How are you feeling?"}
                    {step === 2 && "What's affected?"}
                    {step === 3 && "Anything to add?"}
                  </h2>
                  <p className="text-sm text-textSecondaryLight">
                    Step {step} of 3
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                aria-label="Close check-in form"
              >
                <X className="w-5 h-5 text-textSecondaryLight" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Mood Selection */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  <label className="block text-sm font-medium text-deepSage">
                    Choose your mood level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {MOODS.map((mood) => {
                      const Icon = mood.icon;
                      return (
                        <motion.button
                          key={mood.key}
                          type="button"
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
                  
                  <motion.button
                    type="button"
                    disabled={!canProceedToStep2}
                    onClick={() => setStep(2)}
                    className={`w-full cosmic-button flex items-center justify-center space-x-2 ${
                      !canProceedToStep2 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    whileHover={canProceedToStep2 ? { scale: 1.02 } : {}}
                    whileTap={canProceedToStep2 ? { scale: 0.98 } : {}}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
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
                  <label className="block text-sm font-medium text-deepSage">
                    Pick 1-3 areas of your life that are affecting your mood right now
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {WELLNESS_DIMENSIONS.map((dimension) => (
                      <motion.button
                        key={dimension.key}
                        type="button"
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
                  
                  {selectedDimensions.length > 0 && (
                    <div className="text-xs text-textSecondaryLight text-center">
                      {selectedDimensions.length} of 3 selected
                    </div>
                  )}
                  
                  <motion.button
                    type="button"
                    disabled={!canProceedToStep3}
                    onClick={() => setStep(3)}
                    className={`w-full cosmic-button flex items-center justify-center space-x-2 ${
                      !canProceedToStep3 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    whileHover={canProceedToStep3 ? { scale: 1.02 } : {}}
                    whileTap={canProceedToStep3 ? { scale: 0.98 } : {}}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
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
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-deepSage">
                      What else are you feeling? (optional)
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {affectOptions.map(affect => (
                        <motion.button
                          key={affect}
                          type="button"
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
                  </div>
                  
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
                    disabled={isSubmitting}
                    className={`w-full cosmic-button ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                    whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-deepSage border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
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
