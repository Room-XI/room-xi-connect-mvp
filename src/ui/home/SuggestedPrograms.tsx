import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Clock, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useSession } from '@/lib/session';

interface PrivacyConsents {
  research?: boolean;
}

interface Recommendation {
  eventId: string;
  programId: string;
  title: string;
  programTitle: string;
  matchScore: number;
  triggerReason: string;
  tags: string[];
  locationName: string | null;
  free: boolean;
  cost: string;
  dayOfWeek: string | null;
  startTime: string;
  endTime: string;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  free: boolean;
  locationName: string | null;
  organizer: string | null;
  nextStart: string | null;
}

export default function SuggestedPrograms() {
  const { user } = useSession();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [consents, setConsents] = useState<PrivacyConsents | null>(null);

  useEffect(() => {
    if (user) {
      loadConsents();
    } else {
      // Guest user - no consents needed, load suggestions directly
      setConsents(null);
      loadSuggestions();
    }
  }, [user]);

  useEffect(() => {
    // Only load suggestions for logged-in users after consents are loaded
    if (user && consents !== null) {
      loadSuggestions();
    }
  }, [consents]);

  const loadConsents = async () => {
    if (!user) {
      setConsents(null);
      return;
    }
    
    try {
      const data = await api.privacy.getConsents();
      setConsents(data || { research: false });
    } catch {
      setConsents({ research: false });
    }
  };

  const loadSuggestions = async () => {
    setLoading(true);
    
    try {
      if (user && consents?.research) {
        const { data, error } = await api.events.recommendations();
        
        if (!error && data?.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
          setIsPersonalized(true);
          setPrograms([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await api.programs.list();

      if (error) {
        console.error('Error loading programs:', error);
        return;
      }

      setPrograms((data || []).slice(0, 3));
      setRecommendations([]);
      setIsPersonalized(false);
    } catch (error) {
      console.error('Unexpected error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (startTime: string, dayOfWeek: string | null) => {
    if (!startTime) return null;
    
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const hour = hours % 12 || 12;
      const ampm = hours >= 12 ? 'pm' : 'am';
      const timeStr = minutes === 0 ? `${hour}${ampm}` : `${hour}:${minutes.toString().padStart(2, '0')}${ampm}`;
      
      if (dayOfWeek) {
        const shortDay = dayOfWeek.slice(0, 3);
        return `${shortDay} ${timeStr}`;
      }
      return timeStr;
    } catch {
      return null;
    }
  };

  const formatProgramTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-deepSage">Suggested Programs</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cosmic-card p-4 animate-pulse">
              <div className="h-4 bg-sage/10 rounded mb-2" />
              <div className="h-3 bg-sage/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-sage/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0 && programs.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-deepSage">Suggested Programs</h2>
        <div className="cosmic-card p-6 text-center">
          <p className="text-textSecondaryLight">
            No programs available right now. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-deepSage">
            {isPersonalized ? 'For You' : 'Suggested Programs'}
          </h2>
          {isPersonalized && (
            <Sparkles className="w-4 h-4 text-amber-500" />
          )}
        </div>
        <Link
          to="/explore"
          className="text-sm font-medium text-teal hover:text-teal/80 transition-colors flex items-center space-x-1"
        >
          <span>See all</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isPersonalized && (
        <p className="text-xs text-textSecondaryLight -mt-2">
          Based on your recent mood check-in
        </p>
      )}

      <div className="space-y-3">
        {isPersonalized ? (
          recommendations.map((rec, index) => (
            <motion.div
              key={rec.eventId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Link to={`/program/${rec.programId}`}>
                <motion.div
                  className="cosmic-card p-4 hover:shadow-soft transition-all duration-200 border-l-4 border-l-amber-400"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-deepSage line-clamp-2 flex-1">
                          {rec.title || rec.programTitle}
                        </h3>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                          {Math.round(rec.matchScore * 100)}% match
                        </span>
                      </div>
                      {rec.triggerReason && (
                        <p className="text-xs text-amber-600 italic">
                          {rec.triggerReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-textSecondaryLight">
                      <div className="flex items-center space-x-4">
                        {rec.locationName && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{rec.locationName}</span>
                          </div>
                        )}
                        
                        {rec.startTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(rec.startTime, rec.dayOfWeek)}</span>
                          </div>
                        )}
                      </div>

                      {rec.free && (
                        <div className="flex items-center space-x-1 text-teal">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium">Free</span>
                        </div>
                      )}
                    </div>

                    {rec.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {rec.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {rec.tags.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full">
                            +{rec.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))
        ) : (
          programs.map((program, index) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Link to={`/program/${program.id}`}>
                <motion.div
                  className="cosmic-card p-4 hover:shadow-soft transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-deepSage line-clamp-2">
                        {program.title}
                      </h3>
                      {program.organizer && (
                        <p className="text-sm text-textSecondaryLight">
                          by {program.organizer}
                        </p>
                      )}
                    </div>

                    {program.description && (
                      <p className="text-sm text-textSecondaryLight line-clamp-2">
                        {program.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-textSecondaryLight">
                      <div className="flex items-center space-x-4">
                        {program.locationName && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{program.locationName}</span>
                          </div>
                        )}
                        
                        {program.nextStart && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatProgramTime(program.nextStart)}</span>
                          </div>
                        )}
                      </div>

                      {program.free && (
                        <div className="flex items-center space-x-1 text-teal">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium">Free</span>
                        </div>
                      )}
                    </div>

                    {program.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {program.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {program.tags.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-sage/10 text-sage rounded-full">
                            +{program.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {!user && (
        <p className="text-xs text-center text-textSecondaryLight mt-2">
          <Link to="/auth/login" className="text-teal hover:underline">Sign in</Link> and check in to get personalized recommendations
        </p>
      )}
    </div>
  );
}
