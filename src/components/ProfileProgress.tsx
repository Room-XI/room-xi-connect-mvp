import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User, ChevronRight, Lock } from 'lucide-react';
import api from '@/lib/api';

interface ProgressData {
  percent: number;
  completed: number;
  total: number;
  requiredFields: string[];
  completedFields: string[];
  missingFields: string[];
}

const fieldLabels: Record<string, string> = {
  age: 'Age',
  genderIdentity: 'Gender Identity',
  racialIdentity: 'Racial/Ethnic Identity',
  postalCode: 'Postal Code'
};

export function ProfileProgress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const { data, error } = await api.demographics.getProgress();
      if (data && !error) {
        setProgress(data);
      }
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cosmic-card p-6 animate-pulse">
        <div className="h-5 bg-sage/10 rounded w-1/3 mb-4" />
        <div className="h-3 bg-sage/10 rounded w-full" />
      </div>
    );
  }

  if (!progress) return null;

  const isComplete = progress.percent === 100;

  return (
    <motion.div
      className="cosmic-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isComplete ? 'bg-teal/20' : 'bg-gold/20'
          }`}>
            <User className={`w-5 h-5 ${isComplete ? 'text-teal' : 'text-gold'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-deepSage">Your Profile</h3>
            <p className="text-sm text-textSecondaryLight">
              {isComplete ? 'Complete!' : `${progress.percent}% complete`}
            </p>
          </div>
        </div>
        
        <span className="text-2xl font-bold text-teal">{progress.percent}%</span>
      </div>

      <div className="relative">
        <div className="w-full h-3 bg-sage/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isComplete ? 'bg-teal' : 'bg-gradient-to-r from-gold to-teal'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {!isComplete && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left text-sm text-textSecondaryLight hover:text-deepSage transition-colors"
          >
            <span>
              {progress.completed} of {progress.total} sections complete
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 pt-2"
            >
              <p className="text-xs text-textSecondaryLight mb-2">
                Missing information:
              </p>
              <div className="flex flex-wrap gap-2">
                {progress.missingFields.map(field => (
                  <span
                    key={field}
                    className="px-3 py-1 text-xs bg-gold/10 text-gold rounded-full"
                  >
                    {fieldLabels[field] || field}
                  </span>
                ))}
              </div>
              
              <Link
                to="/settings"
                className="inline-flex items-center space-x-2 mt-3 text-sm font-medium text-teal hover:text-teal/80 transition-colors"
              >
                <span>Complete your profile</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </>
      )}

      <div className="flex items-start space-x-2 p-3 bg-sage/5 rounded-lg border border-borderMutedLight/30">
        <Lock className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" />
        <p className="text-xs text-textSecondaryLight leading-relaxed">
          Your demographics are private and never shared with parents unless you explicitly approve a disclosure request.
        </p>
      </div>
    </motion.div>
  );
}

export default ProfileProgress;
