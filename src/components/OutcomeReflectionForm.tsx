import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import type { MoodKey } from '@/lib/moodConfig';

interface OutcomeReflectionFormProps {
  programId: string;
  programTitle: string;
  recommendationEventId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

const BARRIERS = [
  { id: 'transportation', label: 'Transportation' },
  { id: 'cost', label: 'Cost' },
  { id: 'scheduling', label: 'Scheduling conflict' },
  { id: 'social_anxiety', label: 'Social anxiety' },
  { id: 'accessibility', label: 'Accessibility issues' },
  { id: 'registration', label: 'Registration difficulty' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'other', label: 'Other' },
];

const MOOD_OPTIONS: Array<{ value: MoodKey; label: string }> = [
  { value: 'cold', label: 'Cold (Low energy, disconnected)' },
  { value: 'stormy', label: 'Stormy (Anxious, stressed)' },
  { value: 'foggy', label: 'Foggy (Unclear, confused)' },
  { value: 'clear', label: 'Clear (Calm, balanced)' },
  { value: 'breezy', label: 'Breezy (Energetic, motivated)' },
  { value: 'aurora', label: 'Aurora (Joyful, inspired)' },
];

export default function OutcomeReflectionForm({
  programId,
  programTitle,
  recommendationEventId,
  onComplete,
  onCancel,
}: OutcomeReflectionFormProps) {
  const [helpfulnessRating, setHelpfulnessRating] = useState<number | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [moodBefore, setMoodBefore] = useState<MoodKey | null>(null);
  const [moodAfter, setMoodAfter] = useState<MoodKey | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [barriersEncountered, setBarriersEncountered] = useState<string[]>([]);
  const [barriersResolved, setBarriersResolved] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleBarrier = (barrierId: string) => {
    setBarriersEncountered((prev) =>
      prev.includes(barrierId)
        ? prev.filter((id) => id !== barrierId)
        : [...prev, barrierId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (helpfulnessRating === null) {
      setError('Please rate how helpful the program was');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/api/outcomes', {
        programId,
        recommendationEventId: recommendationEventId || null,
        attended: true,
        attendanceDate: new Date().toISOString().split('T')[0],
        helpfulnessRating,
        wouldRecommend,
        reflectionText: reflectionText.trim() || null,
        moodBefore,
        moodAfter,
        barriersEncountered,
        barriersResolved: barriersEncountered.length > 0 ? barriersResolved : false,
      });

      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('Error submitting reflection:', err);
      setError(err.response?.data?.error || 'Failed to submit reflection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cosmic-card p-6 space-y-6"
    >
      <div className="space-y-2">
        <h3 className="text-xl font-display font-bold text-deepSage">
          How was {programTitle}?
        </h3>
        <p className="text-sm text-textSecondaryLight">
          Your anonymous feedback helps other youth make informed decisions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Helpfulness Rating */}
        <div className="space-y-3">
          <label className="block font-semibold text-deepSage">
            How helpful was it? *
          </label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setHelpfulnessRating(rating)}
                className={`p-3 rounded-lg transition-all ${
                  helpfulnessRating && rating <= helpfulnessRating
                    ? 'text-gold'
                    : 'text-sage/30 hover:text-sage/50'
                }`}
              >
                <Star
                  className="w-8 h-8"
                  fill={
                    helpfulnessRating && rating <= helpfulnessRating
                      ? 'currentColor'
                      : 'none'
                  }
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-textSecondaryLight">
            1 = Not helpful, 5 = Very helpful
          </p>
        </div>

        {/* Would Recommend */}
        <div className="space-y-3">
          <label className="block font-semibold text-deepSage">
            Would you recommend it to a friend?
          </label>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                wouldRecommend === true
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-sage/20 text-textSecondaryLight hover:border-sage/40'
              }`}
            >
              <CheckCircle className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm font-medium">Yes</span>
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                wouldRecommend === false
                  ? 'border-coral bg-coral/10 text-coral'
                  : 'border-sage/20 text-textSecondaryLight hover:border-sage/40'
              }`}
            >
              <AlertCircle className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm font-medium">No</span>
            </button>
          </div>
        </div>

        {/* Mood Before/After */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-deepSage">
              Mood before
            </label>
            <select
              value={moodBefore || ''}
              onChange={(e) => setMoodBefore((e.target.value as MoodKey) || null)}
              className="w-full p-3 rounded-lg border border-sage/20 bg-white text-deepSage focus:outline-none focus:ring-2 focus:ring-teal/50"
            >
              <option value="">Select...</option>
              {MOOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-deepSage">
              Mood after
            </label>
            <select
              value={moodAfter || ''}
              onChange={(e) => setMoodAfter((e.target.value as MoodKey) || null)}
              className="w-full p-3 rounded-lg border border-sage/20 bg-white text-deepSage focus:outline-none focus:ring-2 focus:ring-teal/50"
            >
              <option value="">Select...</option>
              {MOOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reflection Text */}
        <div className="space-y-2">
          <label className="block font-medium text-deepSage">
            What helped? What did you learn?
          </label>
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="Share your experience (optional)..."
            maxLength={1000}
            rows={4}
            className="w-full p-3 rounded-lg border border-sage/20 bg-white text-deepSage placeholder-sage/40 resize-none focus:outline-none focus:ring-2 focus:ring-teal/50"
          />
          <p className="text-xs text-textSecondaryLight text-right">
            {reflectionText.length}/1000
          </p>
        </div>

        {/* Barriers */}
        <div className="space-y-3">
          <label className="block font-medium text-deepSage">
            Any barriers or challenges?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {BARRIERS.map((barrier) => (
              <button
                key={barrier.id}
                type="button"
                onClick={() => toggleBarrier(barrier.id)}
                className={`p-3 rounded-lg border-2 text-sm transition-all ${
                  barriersEncountered.includes(barrier.id)
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-sage/20 text-textSecondaryLight hover:border-sage/40'
                }`}
              >
                {barrier.label}
              </button>
            ))}
          </div>

          {barriersEncountered.length > 0 && (
            <div className="pt-2">
              <label className="flex items-center space-x-2 text-sm text-deepSage">
                <input
                  type="checkbox"
                  checked={barriersResolved}
                  onChange={(e) => setBarriersResolved(e.target.checked)}
                  className="w-4 h-4 rounded border-sage/30 text-teal focus:ring-teal/50"
                />
                <span>These barriers were resolved or addressed</span>
              </label>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-coral/10 border border-coral/20 rounded-lg">
            <p className="text-sm text-coral">{error}</p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 ghost-button"
            >
              Skip for now
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || helpfulnessRating === null}
            className="flex-1 cosmic-button flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
