import { motion } from 'framer-motion';
import { Star, MapPin, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProgramRecommendation } from '@/lib/api';

interface ProgramRecommendationsProps {
  recommendations: ProgramRecommendation[];
  title?: string;
  className?: string;
}

export default function ProgramRecommendations({
  recommendations,
  title = 'Recommended Programs',
  className = '',
}: ProgramRecommendationsProps) {
  const navigate = useNavigate();

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-teal';
    if (score >= 0.6) return 'text-purple-500';
    return 'text-sage';
  };

  const renderStars = (score: number) => {
    const fullStars = Math.floor(score * 5);
    const hasHalfStar = score * 5 - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5" aria-label={`${Math.round(score * 100)}% match`}>
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className={`w-4 h-4 fill-current ${getMatchScoreColor(score)}`} />
        ))}
        {hasHalfStar && (
          <Star className={`w-4 h-4 fill-current ${getMatchScoreColor(score)} opacity-50`} />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-sage/20" />
        ))}
      </div>
    );
  };

  const handleLearnMore = (programId: string) => {
    navigate(`/program/${programId}`);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h3 className="font-display font-semibold text-deepSage text-base">
          {title}
        </h3>
      </div>

      <div className="space-y-2">
        {recommendations.slice(0, 5).map((rec, index) => (
          <motion.div
            key={rec.programId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="bg-gradient-to-br from-purple-50/50 to-teal/5 border border-borderMutedLight rounded-xl p-3 hover:border-teal/30 transition-all duration-200"
          >
            {/* Trigger Reason */}
            <p className="text-xs text-purple-600 mb-2 italic">
              {rec.triggerReason}
            </p>

            {/* Program Title and Match Score */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-deepSage text-sm flex-1">
                {rec.title}
              </h4>
              {renderStars(rec.matchScore)}
            </div>

            {/* Description */}
            {rec.description && (
              <p className="text-xs text-textSecondaryLight mb-2 line-clamp-2">
                {rec.description}
              </p>
            )}

            {/* Tags */}
            {rec.tags && rec.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {rec.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-teal/10 text-teal text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Location and Cost */}
            <div className="flex items-center gap-3 mb-3 text-xs text-textSecondaryLight">
              {rec.locationName && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{rec.locationName}</span>
                </div>
              )}
              {rec.free ? (
                <div className="flex items-center gap-1 text-teal">
                  <DollarSign className="w-3 h-3" />
                  <span className="font-medium">Free</span>
                </div>
              ) : rec.costCents !== null && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>${(rec.costCents / 100).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Learn More Button */}
            <button
              onClick={() => handleLearnMore(rec.programId)}
              className="w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-teal text-cream rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 group"
              aria-label={`Learn more about ${rec.title}`}
            >
              <span>Learn More</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>

      {recommendations.length > 5 && (
        <p className="text-xs text-textSecondaryLight text-center italic">
          Showing top 5 of {recommendations.length} recommendations
        </p>
      )}
    </div>
  );
}
