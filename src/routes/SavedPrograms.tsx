import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bookmark, 
  Calendar, 
  MapPin, 
  DollarSign,
  Heart,
  ArrowRight
} from 'lucide-react';
import { useSession } from '@/lib/session';

interface SavedProgramEntry {
  program: {
    id: string;
    title: string;
    description: string | null;
    organizer: string | null;
    tags: string[];
    free: boolean;
    cost_cents: number | null;
    location_name: string | null;
    next_start: string | null;
  };
  savedAt: string;
}

export default function SavedPrograms() {
  const { user } = useSession();
  const [savedPrograms, setSavedPrograms] = useState<SavedProgramEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSavedPrograms();
    }
  }, [user]);

  const loadSavedPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/programs/saved/list', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to load saved programs');
      }
      
      const data = await response.json();
      setSavedPrograms(data);
    } catch (error) {
      console.error('Error loading saved programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formatCost = (cents: number | null) => {
    if (cents === null) return null;
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (!user) {
    return (
      <div className="py-6">
        <motion.div
          className="cosmic-card p-8 text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-gold/10 rounded-xl flex items-center justify-center mx-auto">
            <Bookmark className="w-8 h-8 text-gold" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-deepSage">
              Sign In to Save Programs
            </h2>
            <p className="text-textSecondaryLight">
              Create an account to bookmark your favorite programs and access them anytime.
            </p>
          </div>
          <Link to="/auth/login" className="inline-block cosmic-button">
            Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-sage/10 rounded w-48 animate-pulse" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="cosmic-card p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 bg-sage/10 rounded w-3/4" />
              <div className="h-4 bg-sage/10 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (savedPrograms.length === 0) {
    return (
      <div className="py-6">
        <motion.div
          className="cosmic-card p-8 text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-gold/20 to-coral/20 rounded-2xl flex items-center justify-center mx-auto">
            <Heart className="w-10 h-10 text-gold" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-deepSage">
              No Saved Programs Yet
            </h2>
            <p className="text-textSecondaryLight max-w-md mx-auto">
              Start exploring and save programs that interest you. They'll appear here so you can easily find them later.
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center space-x-2 cosmic-button"
          >
            <span>Explore Programs</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-display font-bold text-deepSage mb-2">
          Saved Programs
        </h1>
        <p className="text-textSecondaryLight">
          {savedPrograms.length} {savedPrograms.length === 1 ? 'program' : 'programs'} saved
        </p>
      </motion.div>

      {/* Programs List */}
      <div className="space-y-4">
        {savedPrograms.map((entry, index) => (
          <motion.div
            key={entry.program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={`/program/${entry.program.id}`}
              className="block cosmic-card p-5 hover:shadow-xl transition-shadow group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-deepSage group-hover:text-sage transition-colors">
                      {entry.program.title}
                    </h3>
                    {entry.program.organizer && (
                      <p className="text-sm text-textSecondaryLight mt-1">
                        by {entry.program.organizer}
                      </p>
                    )}
                  </div>

                  {entry.program.description && (
                    <p className="text-textSecondaryLight line-clamp-2">
                      {entry.program.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {entry.program.next_start && (
                      <div className="flex items-center gap-1.5 text-teal">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(entry.program.next_start)}</span>
                      </div>
                    )}
                    
                    {entry.program.location_name && (
                      <div className="flex items-center gap-1.5 text-textSecondaryLight">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate max-w-[200px]">
                          {entry.program.location_name}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-textSecondaryLight">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {entry.program.free ? 'Free' : formatCost(entry.program.cost_cents) || 'Cost varies'}
                      </span>
                    </div>
                  </div>

                  {entry.program.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.program.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="cosmic-chip text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {entry.program.tags.length > 3 && (
                        <span className="text-xs text-textSecondaryLight">
                          +{entry.program.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                    <Bookmark className="w-5 h-5 text-gold fill-gold" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer CTA */}
      <motion.div
        className="pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Link
          to="/explore"
          className="w-full ghost-button text-center block"
        >
          Explore More Programs
        </Link>
      </motion.div>
    </div>
  );
}
