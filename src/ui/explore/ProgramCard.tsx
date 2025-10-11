import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Bookmark, 
  BookmarkCheck,
  Home,
  TreePine,
  Accessibility
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/session';
import { addToQueue } from '@/lib/queue';

interface Program {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  free: boolean;
  indoor: boolean | null;
  outdoor: boolean | null;
  cost_cents: number | null;
  location_name: string | null;
  organizer: string | null;
  accessibility_notes: string | null;
  next_start: string | null;
  next_end: string | null;
}

interface ProgramCardProps {
  program: Program;
}

export default function ProgramCard({ program }: ProgramCardProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfSaved();
    }
  }, [user, program.id]);

  const checkIfSaved = async () => {
    try {
      const { data } = await supabase
        .from('saved_programs')
        .select('program_id')
        .eq('user_id', user!.id)
        .eq('program_id', program.id)
        .single();

      setIsSaved(!!data);
    } catch (error) {
      // Not saved (expected for new programs)
      setIsSaved(false);
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking save button
    
    if (!user || isToggling) return;
    
    setIsToggling(true);
    
    try {
      if (isSaved) {
        // Unsave program
        if (navigator.onLine) {
          try {
            await supabase
              .from('saved_programs')
              .delete()
              .eq('user_id', user.id)
              .eq('program_id', program.id);
          } catch (error) {
            // Queue for offline sync
            await addToQueue('unsave_program', {
              user_id: user.id,
              program_id: program.id,
            });
          }
        } else {
          // Offline - queue the action
          await addToQueue('unsave_program', {
            user_id: user.id,
            program_id: program.id,
          });
        }
        setIsSaved(false);
      } else {
        // Save program
        if (navigator.onLine) {
          try {
            await supabase
              .from('saved_programs')
              .insert({
                user_id: user.id,
                program_id: program.id,
              });
          } catch (error) {
            // Queue for offline sync
            await addToQueue('save_program', {
              user_id: user.id,
              program_id: program.id,
            });
          }
        } else {
          // Offline - queue the action
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

  const formatTime = (timestamp: string | null) => {
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

  const formatCost = (cents: number | null) => {
    if (cents === null) return null;
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Link to={`/program/${program.id}`}>
      <motion.div
        className="cosmic-card p-5 hover:shadow-soft transition-all duration-200 relative"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Save Button */}
        <motion.button
          onClick={toggleSave}
          disabled={isToggling}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 ${
            isSaved 
              ? 'text-gold bg-gold/10 hover:bg-gold/20' 
              : 'text-textSecondaryLight hover:text-gold hover:bg-gold/10'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={isSaved ? 'Remove from saved' : 'Save program'}
        >
          {isToggling ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isSaved ? (
            <BookmarkCheck className="w-5 h-5" />
          ) : (
            <Bookmark className="w-5 h-5" />
          )}
        </motion.button>

        <div className="space-y-4 pr-12">
          {/* Header */}
          <div className="space-y-2">
            <h3 className="font-semibold text-deepSage text-lg leading-tight">
              {program.title}
            </h3>
            {program.organizer && (
              <p className="text-sm text-textSecondaryLight">
                by {program.organizer}
              </p>
            )}
          </div>

          {/* Description */}
          {program.description && (
            <p className="text-sm text-textSecondaryLight line-clamp-3">
              {program.description}
            </p>
          )}

          {/* Meta Information */}
          <div className="space-y-2">
            {/* Location and Time */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-textSecondaryLight">
              {program.location_name && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{program.location_name}</span>
                </div>
              )}
              
              {program.next_start && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(program.next_start)}</span>
                </div>
              )}
            </div>

            {/* Cost and Environment */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Cost */}
              <div className={`flex items-center space-x-1 ${
                program.free ? 'text-teal' : 'text-textSecondaryLight'
              }`}>
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">
                  {program.free ? 'Free' : formatCost(program.cost_cents) || 'Cost varies'}
                </span>
              </div>

              {/* Environment indicators */}
              {program.indoor && (
                <div className="flex items-center space-x-1 text-textSecondaryLight">
                  <Home className="w-4 h-4" />
                  <span>Indoor</span>
                </div>
              )}
              
              {program.outdoor && (
                <div className="flex items-center space-x-1 text-textSecondaryLight">
                  <TreePine className="w-4 h-4" />
                  <span>Outdoor</span>
                </div>
              )}

              {/* Accessibility */}
              {program.accessibility_notes && (
                <div className="flex items-center space-x-1 text-teal">
                  <Accessibility className="w-4 h-4" />
                  <span>Accessible</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {program.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {program.tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="cosmic-chip text-xs"
                >
                  {tag}
                </span>
              ))}
              {program.tags.length > 4 && (
                <span className="cosmic-chip text-xs">
                  +{program.tags.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
