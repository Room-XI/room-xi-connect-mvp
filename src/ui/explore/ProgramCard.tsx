import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  DollarSign, 
  Bookmark, 
  BookmarkCheck,
  Calendar,
  Users
} from 'lucide-react';
import api from '@/lib/api';
import { useSession } from '@/lib/session';
import { addToQueue } from '@/lib/queue';

interface ProgramEvent {
  eventId: string;
  eventName: string;
  description: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isDropIn: boolean;
  isRecurring: boolean;
  locationName: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  ageMin: number | null;
  ageMax: number | null;
  cost: string | null;
  costCents: number;
  notes: string | null;
  facilitator: string | null;
  requiresRegistration: boolean;
  registrationUrl: string | null;
  capacity: number | null;
  programId: string;
  programTitle: string;
  programDescription: string | null;
  programTags: string[];
  wellnessDimensions: string[];
  organizer: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  distance?: number | null;
}

interface ProgramCardProps {
  event: ProgramEvent;
}

export default function ProgramCard({ event }: ProgramCardProps) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfSaved();
    }
  }, [user, event.programId]);

  const checkIfSaved = async () => {
    try {
      const { data } = await api.programs.saved.list();
      const savedPrograms = data || [];
      setIsSaved(savedPrograms.some((p: any) => p.id === event.programId));
    } catch (error) {
      setIsSaved(false);
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth/login');
      return;
    }
    
    if (isToggling) return;
    
    setIsToggling(true);
    
    try {
      if (isSaved) {
        if (navigator.onLine) {
          try {
            await api.programs.saved.remove(event.programId);
          } catch (error) {
            await addToQueue('unsave_program', {
              user_id: user.id,
              program_id: event.programId,
            });
          }
        } else {
          await addToQueue('unsave_program', {
            user_id: user.id,
            program_id: event.programId,
          });
        }
        setIsSaved(false);
      } else {
        if (navigator.onLine) {
          try {
            await api.programs.saved.add(event.programId);
          } catch (error) {
            await addToQueue('save_program', {
              user_id: user.id,
              program_id: event.programId,
            });
          }
        } else {
          await addToQueue('save_program', {
            user_id: user.id,
            program_id: event.programId,
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

  const formatEventTime = (startTime: string, endTime: string) => {
    try {
      const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'pm' : 'am';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes}${ampm}`;
      };

      return `${formatTime(startTime)}-${formatTime(endTime)}`;
    } catch {
      return `${startTime}-${endTime}`;
    }
  };

  const formatAgeRange = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && !max) return `${min}+`;
    if (!min && max) return `Up to ${max}`;
    return `${min}-${max}`;
  };

  const formatCost = (cents: number, costText: string | null) => {
    if (cents === 0 || costText === 'Free') return 'Free';
    if (costText) return costText;
    return `$${(cents / 100).toFixed(2)}`;
  };

  const ageRange = formatAgeRange(event.ageMin, event.ageMax);

  return (
    <Link to={`/program/${event.programId}`}>
      <motion.div
        className="cosmic-card p-5 hover:shadow-soft transition-all duration-200 relative"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Save Button */}
        <motion.button
          onClick={toggleSave}
          disabled={isToggling}
          className={`absolute top-4 right-4 p-3 rounded-lg transition-all duration-200 ${
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
              {event.eventName}
            </h3>
            {event.organizer && (
              <p className="text-sm text-textSecondaryLight">
                by {event.organizer}
              </p>
            )}
            {event.isDropIn && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal">
                Drop-In
              </span>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-textSecondaryLight line-clamp-3">
              {event.description}
            </p>
          )}

          {/* Schedule Information */}
          <div className="space-y-2">
            {/* Day and Time */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-textSecondaryLight">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span className="font-medium text-deepSage">
                  {event.dayOfWeek} {formatEventTime(event.startTime, event.endTime)}
                </span>
              </div>
            </div>

            {/* Location */}
            {event.locationName && (
              <div className="flex items-center space-x-1 text-sm text-textSecondaryLight">
                <MapPin className="w-4 h-4" />
                <span>{event.locationName}</span>
              </div>
            )}

            {/* Cost, Age Range, and Other Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Cost */}
              <div className={`flex items-center space-x-1 ${
                event.costCents === 0 || event.cost === 'Free' ? 'text-teal' : 'text-textSecondaryLight'
              }`}>
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">
                  {formatCost(event.costCents, event.cost)}
                </span>
              </div>

              {/* Age Range */}
              {ageRange && (
                <div className="flex items-center space-x-1 text-textSecondaryLight">
                  <Users className="w-4 h-4" />
                  <span>Ages {ageRange}</span>
                </div>
              )}

              {/* Distance */}
              {event.distance !== undefined && event.distance !== null && (
                <div className="flex items-center space-x-1 text-textSecondaryLight">
                  <MapPin className="w-4 h-4" />
                  <span>{event.distance}km away</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {event.programTags && event.programTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.programTags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="cosmic-chip text-xs"
                >
                  {tag}
                </span>
              ))}
              {event.programTags.length > 4 && (
                <span className="cosmic-chip text-xs">
                  +{event.programTags.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
