import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud, CloudRain, Sun, Zap, Moon, CloudSnow } from 'lucide-react';
import { addToQueue } from '@/lib/queue';
import { supabase } from '@/lib/supabase';

interface CheckInFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Custom mood icons with cosmic weather theme
const moodOptions = [
  { level: 1, label: 'Stormy', icon: CloudRain, color: 'text-slate-500' },
  { level: 2, label: 'Foggy', icon: CloudSnow, color: 'text-slate-400' },
  { level: 3, label: 'Overcast', icon: Cloud, color: 'text-slate-300' },
  { level: 4, label: 'Calm', icon: Sun, color: 'text-amber-500' },
  { level: 5, label: 'Upbeat', icon: Zap, color: 'text-orange-500' },
  { level: 6, label: 'Aurora', icon: Moon, color: 'text-purple-500' },
];

const affectOptions = [
  'grateful', 'hopeful', 'excited', 'peaceful', 'creative', 'confident',
  'tired', 'stressed', 'overwhelmed', 'lonely', 'frustrated', 'anxious',
  'curious', 'motivated', 'content', 'restless', 'focused', 'social'
];

export default function CheckInForm({ isOpen, onClose, onSuccess }: CheckInFormProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedAffects, setSelectedAffects] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMood) return;
    
    setIsSubmitting(true);
    
    try {
      const checkInData = {
        timestamp: new Date().toISOString(),
        dimension: 'mood',
        mood_level_1_6: selectedMood,
        affect_tags: selectedAffects,
        note: note.trim() || null,
        local_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      
      // Try to submit immediately if online
      if (navigator.onLine) {
        try {
          await supabase.rpc('create_or_update_checkin', {
            p_timestamp: checkInData.timestamp,
            p_dimension: checkInData.dimension,
            p_mood_level_1_6: checkInData.mood_level_1_6,
            p_affect_tags: checkInData.affect_tags,
            p_note: checkInData.note,
            p_local_tz: checkInData.local_tz,
          });
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
      setSelectedMood(null);
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

  const toggleAffect = (affect: string) => {
    setSelectedAffects(prev => 
      prev.includes(affect) 
        ? prev.filter(a => a !== affect)
        : [...prev, affect]
    );
  };

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
          onClick={onClose}
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
              <h2 className="text-xl font-display font-semibold text-deepSage">
                How are you feeling?
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
                aria-label="Close check-in form"
              >
                <X className="w-5 h-5 text-textSecondaryLight" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Mood Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-deepSage">
                  Choose your mood
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {moodOptions.map(({ level, label, icon: Icon, color }) => (
                    <motion.button
                      key={level}
                      type="button"
                      onClick={() => setSelectedMood(level)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedMood === level
                          ? 'border-teal bg-teal/10 shadow-glow-teal'
                          : 'border-borderMutedLight bg-surface hover:border-sage'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                      <div className="text-sm font-medium text-deepSage">
                        {label}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Affect Tags */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-deepSage">
                  What else are you feeling? (optional)
                </label>
                <div className="flex flex-wrap gap-2">
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
                disabled={!selectedMood || isSubmitting}
                className={`w-full cosmic-button ${
                  !selectedMood || isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
                whileHover={selectedMood && !isSubmitting ? { scale: 1.02 } : {}}
                whileTap={selectedMood && !isSubmitting ? { scale: 0.98 } : {}}
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
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
