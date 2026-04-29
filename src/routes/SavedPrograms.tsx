import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bookmark, 
  Calendar, 
  MapPin, 
  DollarSign,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { useSession } from '@/lib/session';
import api from '@/lib/api';

interface SavedProgramEntry {
  program: {
    id: string;
    title: string;
    description: string | null;
    organizer: string | null;
    tags: string[];
    free: boolean;
    costCents: number | null;
    locationName: string | null;
    nextStart: string | null;
  };
  savedAt: string;
}

interface RsvpEntry {
  programId: string;
  status: string;
  createdAt: string;
  programTitle: string | null;
  programOrganizer: string | null;
  programLocation: string | null;
}

// TournamentRegistration interface removed per pilot lockdown (Prompt 1).
// Tournaments are out of pilot v1; /api/tournaments returns 410.

type TabType = 'registered' | 'saved';

export default function SavedPrograms() {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('registered');
  const [savedPrograms, setSavedPrograms] = useState<SavedProgramEntry[]>([]);
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingRegistered, setLoadingRegistered] = useState(true);

  useEffect(() => {
    if (user) {
      loadSavedPrograms();
      loadRegisteredPrograms();
    }
  }, [user]);

  const loadSavedPrograms = async () => {
    try {
      setLoadingSaved(true);
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
      setLoadingSaved(false);
    }
  };

  const loadRegisteredPrograms = async () => {
    try {
      setLoadingRegistered(true);
      // Tournament registrations removed per pilot lockdown (Prompt 1).
      const rsvpResult = await api.rsvp.myRsvps();

      if (rsvpResult.data?.rsvps) {
        setRsvps(rsvpResult.data.rsvps);
      }
    } catch (error) {
      console.error('Error loading registered programs:', error);
    } finally {
      setLoadingRegistered(false);
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

  const loading = activeTab === 'saved' ? loadingSaved : loadingRegistered;

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

  return (
    <div className="py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-display font-bold text-deepSage mb-4">
          My Programs
        </h1>

        <div className="flex gap-2 p-1 bg-gray-100 rounded-full">
          <button
            onClick={() => setActiveTab('registered')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'registered'
                ? 'bg-teal text-white'
                : 'bg-transparent text-gray-600'
            }`}
          >
            Registered
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              activeTab === 'saved'
                ? 'bg-teal text-white'
                : 'bg-transparent text-gray-600'
            }`}
          >
            Saved
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="cosmic-card p-4 animate-pulse">
              <div className="space-y-3">
                <div className="h-6 bg-sage/10 rounded w-3/4" />
                <div className="h-4 bg-sage/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'registered' ? (
        <RegisteredTab
          rsvps={rsvps}
          formatDate={formatDate}
        />
      ) : (
        <SavedTab
          savedPrograms={savedPrograms}
          formatDate={formatDate}
          formatCost={formatCost}
        />
      )}
    </div>
  );
}

function RegisteredTab({
  rsvps,
  formatDate,
}: {
  rsvps: RsvpEntry[];
  formatDate: (ts: string | null) => string | null;
}) {
  const hasRsvps = rsvps.length > 0;

  if (!hasRsvps) {
    return (
      <motion.div
        className="cosmic-card p-8 text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-teal/20 to-sage/20 rounded-2xl flex items-center justify-center mx-auto">
          <Calendar className="w-10 h-10 text-teal" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-deepSage">
            No Registrations Yet
          </h2>
          <p className="text-textSecondaryLight max-w-md mx-auto">
            You haven't registered for any programs yet. Check out the Explore page to find something!
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
    );
  }

  return (
    <div className="space-y-6">
      {hasRsvps && (
        <div className="space-y-4">
          <p className="text-sm text-textSecondaryLight">
            {rsvps.length} {rsvps.length === 1 ? 'program' : 'programs'} registered
          </p>
          {rsvps.map((rsvp, index) => (
            <motion.div
              key={rsvp.programId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/program/${rsvp.programId}`}
                className="block cosmic-card p-5 hover:shadow-xl transition-shadow group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-deepSage group-hover:text-sage transition-colors">
                        {rsvp.programTitle || 'Untitled Program'}
                      </h3>
                      {rsvp.programOrganizer && (
                        <p className="text-sm text-textSecondaryLight mt-1">
                          by {rsvp.programOrganizer}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {rsvp.createdAt && (
                        <div className="flex items-center gap-1.5 text-teal">
                          <Calendar className="w-4 h-4" />
                          <span>Registered {formatDate(rsvp.createdAt)}</span>
                        </div>
                      )}
                      {rsvp.programLocation && (
                        <div className="flex items-center gap-1.5 text-textSecondaryLight">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">
                            {rsvp.programLocation}
                          </span>
                        </div>
                      )}
                    </div>

                    <span className="inline-block cosmic-chip text-xs capitalize">
                      {rsvp.status}
                    </span>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-teal" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tournament Teams section removed per pilot lockdown (Prompt 1). */}

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

function SavedTab({
  savedPrograms,
  formatDate,
  formatCost,
}: {
  savedPrograms: SavedProgramEntry[];
  formatDate: (ts: string | null) => string | null;
  formatCost: (cents: number | null) => string | null;
}) {
  if (savedPrograms.length === 0) {
    return (
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
            You haven't saved any programs yet. Tap the bookmark icon on any program to save it.
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
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-textSecondaryLight">
        {savedPrograms.length} {savedPrograms.length === 1 ? 'program' : 'programs'} saved
      </p>

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
                  {entry.program.nextStart && (
                    <div className="flex items-center gap-1.5 text-teal">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(entry.program.nextStart)}</span>
                    </div>
                  )}
                  
                  {entry.program.locationName && (
                    <div className="flex items-center gap-1.5 text-textSecondaryLight">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">
                        {entry.program.locationName}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 text-textSecondaryLight">
                    <DollarSign className="w-4 h-4" />
                    <span>
                      {entry.program.free ? 'Free' : formatCost(entry.program.costCents) || 'Cost varies'}
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
