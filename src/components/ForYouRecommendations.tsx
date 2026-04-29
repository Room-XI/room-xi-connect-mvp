import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight, MapPin, Calendar, Loader, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecommendedProgram {
  id: string;
  title: string;
  organizer: string | null;
  category: string | null;
  location: string | null;
  nextSession: string | null;
  matchReason: string;
  matchScore: number;
}

interface ForYouRecommendationsProps {
  className?: string;
}

export function ForYouRecommendations({ className = '' }: ForYouRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/programs/recommendations', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      console.error('Error loading recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-teal/5 to-gold/5 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-teal/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-teal" />
          </div>
          <h2 className="text-lg font-semibold text-deepSage">For You</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-teal animate-spin" />
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return (
      <div className={`bg-gradient-to-r from-teal/5 to-gold/5 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-teal/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-teal" />
          </div>
          <h2 className="text-lg font-semibold text-deepSage">For You</h2>
        </div>
        <div className="text-center py-4">
          <p className="text-textSecondaryLight text-sm">
            {error ? 'Unable to load recommendations' : 'No recommendations yet'}
          </p>
          <Link 
            to="/explore" 
            className="inline-flex items-center gap-1 text-teal text-sm font-medium mt-2 hover:underline"
          >
            Explore all programs
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-teal/5 to-gold/5 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-teal" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-deepSage">For You</h2>
            <p className="text-xs text-textSecondaryLight">Based on your interests</p>
          </div>
        </div>
        <button
          onClick={loadRecommendations}
          className="p-2 text-textSecondaryLight hover:text-teal hover:bg-teal/10 rounded-lg transition-colors"
          aria-label="Refresh recommendations"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {recommendations.slice(0, 3).map((program, index) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Link
              to={`/program/${program.id}`}
              className="block bg-white rounded-xl p-4 border border-borderMutedLight/50 hover:border-teal/30 hover:shadow-soft transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-deepSage truncate">{program.title}</h3>
                  {program.organizer && (
                    <p className="text-sm text-textSecondaryLight truncate">{program.organizer}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-textSecondaryLight">
                    {program.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {program.location}
                      </span>
                    )}
                    {program.nextSession && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {program.nextSession}
                      </span>
                    )}
                  </div>

                  {program.matchReason && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-teal/10 text-teal text-xs rounded-full">
                      <Sparkles className="w-3 h-3" />
                      {program.matchReason}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <Link
        to="/explore"
        className="flex items-center justify-center gap-2 mt-4 py-2 text-teal text-sm font-medium hover:underline"
      >
        See all programs
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default ForYouRecommendations;
