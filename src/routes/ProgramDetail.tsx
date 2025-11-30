import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Users, 
  Calendar,
  Bookmark,
  BookmarkCheck,
  Share,
  ExternalLink,
  Accessibility,
  Home,
  TreePine,
  Star,
  ThumbsUp,
  TrendingUp,
  AlertCircle,
  Navigation
} from 'lucide-react';
import api, { fetchApi } from '@/lib/api';
import { useSession } from '@/lib/session';
import { addToQueue } from '@/lib/queue';

interface Program {
  id: string;
  title: string;
  description: string | null;
  long_description: string | null;
  tags: string[];
  free: boolean;
  indoor: boolean | null;
  outdoor: boolean | null;
  cost_cents: number | null;
  location_name: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  organizer: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  accessibility_notes: string | null;
  next_start: string | null;
  next_end: string | null;
  capacity: number | null;
  age_min: number | null;
  age_max: number | null;
  created_at: string;
}

interface PeerInsights {
  totalResponses: number;
  averageRating: number | null;
  recommendationRate: number | null;
  moodImprovementRate: number | null;
  commonBarriers: Array<{ barrier: string; frequency: number }>;
  commonBenefits: Array<{ benefit: string; count: number }>;
  suppressed: boolean;
  suppressionReason: string | null;
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [peerInsights, setPeerInsights] = useState<PeerInsights | null>(null);

  useEffect(() => {
    if (id) {
      loadProgram();
      loadPeerInsights();
    }
  }, [id]);

  useEffect(() => {
    if (user && program) {
      checkIfSaved();
    }
  }, [user, program]);

  const loadProgram = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await api.programs.get(id!);

      if (error) {
        console.error('Error loading program:', error);
        return;
      }

      setProgram(data as any);
    } catch (error) {
      console.error('Unexpected error loading program:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPeerInsights = async () => {
    try {
      const { data } = await fetchApi(`/outcomes/program/${id}`);
      setPeerInsights(data);
    } catch (error) {
      console.error('Error loading peer insights:', error);
      setPeerInsights(null);
    }
  };

  const checkIfSaved = async () => {
    try {
      const { data } = await api.programs.saved.list();
      const savedPrograms = data || [];
      setIsSaved(savedPrograms.some((p: any) => p.id === program!.id));
    } catch (error) {
      setIsSaved(false);
    }
  };

  const toggleSave = async () => {
    if (!user || !program || isToggling) return;
    
    setIsToggling(true);
    
    try {
      if (isSaved) {
        if (navigator.onLine) {
          try {
            await api.programs.saved.remove(program.id);
          } catch (error) {
            await addToQueue('unsave_program', {
              user_id: user.id,
              program_id: program.id,
            });
          }
        } else {
          await addToQueue('unsave_program', {
            user_id: user.id,
            program_id: program.id,
          });
        }
        setIsSaved(false);
      } else {
        if (navigator.onLine) {
          try {
            await api.programs.saved.add(program.id);
          } catch (error) {
            await addToQueue('save_program', {
              user_id: user.id,
              program_id: program.id,
            });
          }
        } else {
          await addToQueue('save_program', {
            user_id: user.id,
            program_id: program.id,
          });
        }
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const shareProgram = async () => {
    if (navigator.share && program) {
      try {
        await navigator.share({
          title: program.title,
          text: program.description || 'Check out this program!',
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatCost = (cents: number | null) => {
    if (cents === null) return null;
    return `$${(cents / 100).toFixed(2)}`;
  };

  const openDirections = () => {
    if (!program?.lat || !program?.lng) return;

    const lat = parseFloat(program.lat);
    const lng = parseFloat(program.lng);
    const destination = `${lat},${lng}`;
    const label = encodeURIComponent(program.location_name || program.title);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let url: string;

    if (isIOS) {
      url = `maps://maps.apple.com/?daddr=${destination}&q=${label}`;
    } else if (isAndroid) {
      url = `geo:0,0?q=${destination}(${label})`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&query=${label}`;
    }

    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-sage/10 rounded animate-pulse" />
          <div className="h-8 bg-sage/10 rounded w-48 animate-pulse" />
        </div>
        
        <div className="cosmic-card p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-8 bg-sage/10 rounded" />
            <div className="h-4 bg-sage/10 rounded w-3/4" />
            <div className="h-32 bg-sage/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="py-6">
        <motion.div
          className="cosmic-card p-8 text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-16 h-16 bg-coral/10 rounded-xl flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8 text-coral" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-deepSage">
              Program Not Found
            </h2>
            <p className="text-textSecondaryLight">
              The program you're looking for doesn't exist or has been removed.
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-block cosmic-button"
          >
            Explore Programs
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-textSecondaryLight" />
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={shareProgram}
            className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
          >
            <Share className="w-5 h-5 text-textSecondaryLight" />
          </button>
          
          {user && (
            <button
              onClick={toggleSave}
              disabled={isToggling}
              className={`p-2 rounded-lg transition-colors ${
                isSaved 
                  ? 'text-gold bg-gold/10 hover:bg-gold/20' 
                  : 'text-textSecondaryLight hover:bg-gold/10 hover:text-gold'
              }`}
            >
              {isToggling ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck className="w-5 h-5" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Program Header */}
      <motion.div
        className="cosmic-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        <div className="space-y-3">
          <h1 className="text-2xl font-display font-bold text-deepSage">
            {program.title}
          </h1>
          
          {program.organizer && (
            <p className="text-lg text-textSecondaryLight">
              by {program.organizer}
            </p>
          )}
          
          {program.description && (
            <p className="text-textSecondaryLight">
              {program.description}
            </p>
          )}
        </div>

        {/* Tags */}
        {program.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {program.tags.map(tag => (
              <span
                key={tag}
                className="cosmic-chip text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Info */}
      <motion.div
        className="grid grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="cosmic-card p-4 text-center">
          <DollarSign className={`w-6 h-6 mx-auto mb-2 ${
            program.free ? 'text-teal' : 'text-textSecondaryLight'
          }`} />
          <div className="font-semibold text-deepSage">
            {program.free ? 'Free' : formatCost(program.cost_cents) || 'Cost varies'}
          </div>
          <div className="text-sm text-textSecondaryLight">
            Cost
          </div>
        </div>
        
        {program.capacity && (
          <div className="cosmic-card p-4 text-center">
            <Users className="w-6 h-6 text-sage mx-auto mb-2" />
            <div className="font-semibold text-deepSage">
              {program.capacity}
            </div>
            <div className="text-sm text-textSecondaryLight">
              Capacity
            </div>
          </div>
        )}
      </motion.div>

      {/* Details */}
      <motion.div
        className="cosmic-card p-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* Long Description */}
        {program.long_description && (
          <div className="space-y-3">
            <h3 className="font-semibold text-deepSage">About This Program</h3>
            <div className="prose prose-sm max-w-none text-textSecondaryLight">
              {program.long_description.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-3 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {(program.location_name || program.address) && (
          <div className="space-y-3">
            <h3 className="font-semibold text-deepSage">Location</h3>
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-gold mt-0.5" />
              <div className="flex-1">
                {program.location_name && (
                  <p className="font-medium text-deepSage">
                    {program.location_name}
                  </p>
                )}
                {program.address && (
                  <p className="text-sm text-textSecondaryLight">
                    {program.address}
                  </p>
                )}
              </div>
            </div>
            {program.lat && program.lng && (
              <button
                onClick={openDirections}
                className="w-full cosmic-button flex items-center justify-center space-x-2"
              >
                <Navigation className="w-5 h-5" />
                <span>Get Directions</span>
              </button>
            )}
          </div>
        )}

        {/* Environment */}
        {(program.indoor || program.outdoor) && (
          <div className="space-y-3">
            <h3 className="font-semibold text-deepSage">Environment</h3>
            <div className="flex space-x-4">
              {program.indoor && (
                <div className="flex items-center space-x-2">
                  <Home className="w-4 h-4 text-sage" />
                  <span className="text-sm text-textSecondaryLight">Indoor</span>
                </div>
              )}
              {program.outdoor && (
                <div className="flex items-center space-x-2">
                  <TreePine className="w-4 h-4 text-sage" />
                  <span className="text-sm text-textSecondaryLight">Outdoor</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Age Range */}
        {(program.age_min || program.age_max) && (
          <div className="space-y-3">
            <h3 className="font-semibold text-deepSage">Age Range</h3>
            <p className="text-textSecondaryLight">
              {program.age_min && program.age_max 
                ? `${program.age_min} - ${program.age_max} years`
                : program.age_min 
                ? `${program.age_min}+ years`
                : `Up to ${program.age_max} years`
              }
            </p>
          </div>
        )}

        {/* Accessibility */}
        {program.accessibility_notes && (
          <div className="space-y-3">
            <h3 className="font-semibold text-deepSage flex items-center space-x-2">
              <Accessibility className="w-5 h-5 text-teal" />
              <span>Accessibility</span>
            </h3>
            <p className="text-textSecondaryLight">
              {program.accessibility_notes}
            </p>
          </div>
        )}
      </motion.div>

      {/* Peer Insights */}
      {peerInsights && !peerInsights.suppressed && peerInsights.totalResponses > 0 && (
        <motion.div
          className="cosmic-card p-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          <div className="space-y-2">
            <h3 className="font-semibold text-deepSage">What youth are saying</h3>
            <p className="text-xs text-textSecondaryLight">
              Based on {peerInsights.totalResponses} anonymous review{peerInsights.totalResponses !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Average Rating */}
            {peerInsights.averageRating !== null && (
              <div className="p-4 bg-gold/5 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Star className="w-5 h-5 text-gold fill-gold" />
                  <span className="text-2xl font-bold text-deepSage">
                    {peerInsights.averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-textSecondaryLight">/5</span>
                </div>
                <p className="text-xs text-textSecondaryLight">Helpfulness</p>
              </div>
            )}

            {/* Recommendation Rate */}
            {peerInsights.recommendationRate !== null && (
              <div className="p-4 bg-teal/5 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <ThumbsUp className="w-5 h-5 text-teal" />
                  <span className="text-2xl font-bold text-deepSage">
                    {peerInsights.recommendationRate}%
                  </span>
                </div>
                <p className="text-xs text-textSecondaryLight">Would recommend</p>
              </div>
            )}

            {/* Mood Improvement Rate */}
            {peerInsights.moodImprovementRate !== null && (
              <div className="p-4 bg-sage/5 rounded-lg col-span-2">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-sage" />
                  <span className="text-2xl font-bold text-deepSage">
                    {peerInsights.moodImprovementRate}%
                  </span>
                </div>
                <p className="text-xs text-textSecondaryLight">
                  Reported improved mood after attending
                </p>
              </div>
            )}
          </div>

          {/* Common Barriers */}
          {peerInsights.commonBarriers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-deepSage flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-gold" />
                <span>Things to know</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {peerInsights.commonBarriers.map((barrier, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gold/10 text-gold text-xs rounded-full"
                  >
                    {barrier.barrier.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Common Benefits */}
          {peerInsights.commonBenefits.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-deepSage">Common benefits</h4>
              <div className="flex flex-wrap gap-2">
                {peerInsights.commonBenefits.map((benefit, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-teal/10 text-teal text-xs rounded-full"
                  >
                    {benefit.benefit}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-sage/10">
            <p className="text-xs text-textSecondaryLight italic">
              Your feedback helps other youth make informed decisions (completely anonymous)
            </p>
          </div>
        </motion.div>
      )}

      {/* No Insights Yet */}
      {peerInsights && (peerInsights.suppressed || peerInsights.totalResponses === 0) && (
        <motion.div
          className="cosmic-card p-6 text-center space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          <div className="w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-sage" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-deepSage">Not enough feedback yet</h4>
            <p className="text-sm text-textSecondaryLight">
              Be one of the first to try this program and share your experience!
            </p>
          </div>
        </motion.div>
      )}

      {/* Contact Information */}
      {(program.contact_email || program.contact_phone || program.website_url) && (
        <motion.div
          className="cosmic-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h3 className="font-semibold text-deepSage">Contact Information</h3>
          
          <div className="space-y-3">
            {program.contact_email && (
              <a
                href={`mailto:${program.contact_email}`}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-sage/5 transition-colors"
              >
                <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center">
                  <span className="text-teal">@</span>
                </div>
                <div>
                  <p className="font-medium text-deepSage">Email</p>
                  <p className="text-sm text-textSecondaryLight">
                    {program.contact_email}
                  </p>
                </div>
              </a>
            )}
            
            {program.contact_phone && (
              <a
                href={`tel:${program.contact_phone}`}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-sage/5 transition-colors"
              >
                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                  <span className="text-gold">📞</span>
                </div>
                <div>
                  <p className="font-medium text-deepSage">Phone</p>
                  <p className="text-sm text-textSecondaryLight">
                    {program.contact_phone}
                  </p>
                </div>
              </a>
            )}
            
            {program.website_url && (
              <a
                href={program.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-sage/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-sage/10 rounded-lg flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-sage" />
                  </div>
                  <div>
                    <p className="font-medium text-deepSage">Website</p>
                    <p className="text-sm text-textSecondaryLight">
                      Visit program website
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-textSecondaryLight" />
              </a>
            )}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <Link
          to="/qr"
          className="w-full cosmic-button text-center block"
        >
          Check In with QR Code
        </Link>
        
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
