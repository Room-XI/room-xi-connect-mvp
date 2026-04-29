import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  MapPin, 
  DollarSign, 
  Bookmark, 
  BookmarkCheck,
  Calendar,
  Users,
  Clock,
  Share2
} from 'lucide-react';
import api from '@/lib/api';
import { useSession } from '@/lib/session';
import { addToQueue } from '@/lib/queue';

interface WeeklySchedule {
  days: string[];
  startTime: string;
  endTime: string;
  location: string | null;
  isDropIn?: boolean;
}

interface GroupedProgram {
  programId: string;
  programTitle: string;
  programDescription: string | null;
  programTags: string[];
  wellnessDimensions?: string[];
  organizer: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  locationName: string | null;
  address: string | null;
  lat?: string | null;
  lng?: string | null;
  ageMin: number | null;
  ageMax: number | null;
  free?: boolean;
  costCents: number;
  isDropIn: boolean;
  distance?: number | null;
  weeklySchedule: WeeklySchedule[];
  scheduleSummary: string;
  matchScore?: number;
  capacity?: number;
  currentAttendance?: number;
}

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
  currentAttendance?: number;
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
  matchScore?: number;
}

interface ProgramCardProps {
  program?: GroupedProgram;
  event?: ProgramEvent;
}

export default function ProgramCard({ program, event }: ProgramCardProps) {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const programId = program?.programId || event?.programId || '';
  const title = program?.programTitle || event?.eventName || '';
  const description = program?.programDescription || event?.description;
  const organizer = program?.organizer || event?.organizer;
  const tags = program?.programTags || event?.programTags || [];
  const locationName = program?.locationName || event?.locationName;
  const ageMin = program?.ageMin || event?.ageMin;
  const ageMax = program?.ageMax || event?.ageMax;
  const costCents = program?.costCents ?? event?.costCents ?? 0;
  const isFree = program?.free || costCents === 0 || event?.cost === 'Free';
  const isDropIn = program?.isDropIn || event?.isDropIn || false;
  const distance = program?.distance ?? event?.distance;
  const matchScore = program?.matchScore ?? event?.matchScore;
  const capacity = program?.capacity ?? event?.capacity;
  const currentAttendance = program?.currentAttendance ?? event?.currentAttendance ?? 0;
  const spotsLeft = capacity ? Math.max(0, capacity - currentAttendance) : null;
  const spotsWarning = spotsLeft !== null && spotsLeft < 10;

  useEffect(() => {
    if (user && programId) {
      checkIfSaved();
    }
  }, [user, programId]);

  const checkIfSaved = async () => {
    try {
      const { data } = await api.programs.saved.list();
      const savedPrograms = data || [];
      setIsSaved(savedPrograms.some((p: any) => p.id === programId));
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
            await api.programs.saved.remove(programId);
          } catch (error) {
            await addToQueue('unsave_program', {
              user_id: user.id,
              program_id: programId,
            });
          }
        } else {
          await addToQueue('unsave_program', {
            user_id: user.id,
            program_id: programId,
          });
        }
        setIsSaved(false);
      } else {
        if (navigator.onLine) {
          try {
            await api.programs.saved.add(programId);
          } catch (error) {
            await addToQueue('save_program', {
              user_id: user.id,
              program_id: programId,
            });
          }
        } else {
          await addToQueue('save_program', {
            user_id: user.id,
            program_id: programId,
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

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isSharing) return;
    
    setIsSharing(true);
    
    try {
      const shareUrl = `${window.location.origin}/program/${programId}`;
      const shareData = {
        title: title,
        text: description ? `${title} - ${description.substring(0, 100)}...` : title,
        url: shareUrl,
      };

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error: any) {
      // Handle user canceling share dialog
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    try {
      const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'pm' : 'am';
        const hour12 = hour % 12 || 12;
        return minutes === '00' ? `${hour12}${ampm}` : `${hour12}:${minutes}${ampm}`;
      };

      return `${formatTime(startTime)}-${formatTime(endTime)}`;
    } catch {
      return `${startTime}-${endTime}`;
    }
  };

  const formatAgeRange = (min: number | null | undefined, max: number | null | undefined) => {
    if (!min && !max) return null;
    if (min && !max) return `${min}+`;
    if (!min && max) return `Up to ${max}`;
    return `${min}-${max}`;
  };

  const getShortDayName = (day: string) => {
    const dayMap: Record<string, string> = {
      'Monday': 'Mon',
      'Tuesday': 'Tue',
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };
    return dayMap[day] || day;
  };

  const formatScheduleDays = (days: string[]) => {
    if (days.length === 1) return getShortDayName(days[0]);
    if (days.length === 2) return `${getShortDayName(days[0])} & ${getShortDayName(days[1])}`;
    return days.map(getShortDayName).join(', ');
  };

  const ageRange = formatAgeRange(ageMin, ageMax);

  return (
    <Link 
      to={`/program/${programId}`}
      aria-label={`${t('programs.viewDetails')} ${title}${organizer ? ` by ${organizer}` : ''}${isFree ? ', ' + t('programs.free') : ''}${isDropIn ? ', Drop-in available' : ''}`}
    >
      <motion.div
        className="cosmic-card p-5 hover:shadow-soft transition-all duration-200 relative focus-within:ring-2 focus-within:ring-teal focus-within:ring-offset-2"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          {matchScore !== undefined && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal/20 text-teal">
              {t('explore.matchScore', { score: matchScore })}
            </span>
          )}
          
          <div className="flex items-center gap-1">
            <motion.button
              onClick={handleShare}
              disabled={isSharing}
              className="p-3 rounded-lg transition-all duration-200 text-textSecondaryLight hover:text-cyan-500 hover:bg-cyan-500/10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={t('explore.share')}
            >
              {isSharing ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              ) : (
                <Share2 className="w-5 h-5" aria-hidden="true" />
              )}
            </motion.button>

            <motion.button
              onClick={toggleSave}
              disabled={isToggling}
              className={`p-3 rounded-lg transition-all duration-200 ${
                isSaved 
                  ? 'text-gold bg-gold/10 hover:bg-gold/20' 
                  : 'text-textSecondaryLight hover:text-gold hover:bg-gold/10'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isSaved ? t('explore.card.removeFromSaved') : t('explore.bookmark')}
            >
              {isToggling ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              ) : isSaved ? (
                <BookmarkCheck className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Bookmark className="w-5 h-5" aria-hidden="true" />
              )}
            </motion.button>
          </div>
        </div>

        <div className="space-y-4 pr-24">
          <div className="space-y-2">
            <h3 className="font-semibold text-deepSage text-lg leading-tight">
              {title}
            </h3>
            {organizer && (
              <p className="text-sm text-textSecondaryLight">
                {t('explore.card.by', { organizer })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {isDropIn && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal">
                  {t('explore.card.dropIn')}
                </span>
              )}
              {spotsWarning && spotsLeft !== null && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600">
                  {t('explore.spotsLeft', { count: spotsLeft })}
                </span>
              )}
            </div>
          </div>

          {description && (
            <p className="text-sm text-textSecondaryLight line-clamp-3">
              {description}
            </p>
          )}

          <div className="space-y-2">
            {program?.weeklySchedule && program.weeklySchedule.length > 0 ? (
              <div className="space-y-1.5">
                {program.weeklySchedule.map((schedule, idx) => (
                  <div key={idx} className="flex items-center space-x-1 text-sm">
                    <Calendar className="w-4 h-4 text-textSecondaryLight flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium text-deepSage">
                      {formatScheduleDays(schedule.days)} {formatEventTime(schedule.startTime, schedule.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            ) : event ? (
              <div className="flex flex-wrap items-center gap-4 text-sm text-textSecondaryLight">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium text-deepSage">
                    {event.dayOfWeek} {formatEventTime(event.startTime, event.endTime)}
                  </span>
                </div>
              </div>
            ) : program?.scheduleSummary && (
              <div className="flex items-center space-x-1 text-sm">
                <Clock className="w-4 h-4 text-textSecondaryLight" aria-hidden="true" />
                <span className="font-medium text-deepSage">{program.scheduleSummary}</span>
              </div>
            )}

            {locationName && (
              <div className="flex items-center space-x-1 text-sm text-textSecondaryLight">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>{locationName}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className={`flex items-center space-x-1 ${
                isFree ? 'text-teal' : 'text-textSecondaryLight'
              }`}>
                <DollarSign className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">
                  {isFree || costCents === 0 ? t('programs.free') : `$${(costCents / 100).toFixed(2)}`}
                </span>
              </div>

              {ageRange && (
                <div className="flex items-center space-x-1 text-textSecondaryLight">
                  <Users className="w-4 h-4" aria-hidden="true" />
                  <span>{t('explore.card.ages', { range: ageRange })}</span>
                </div>
              )}

              {distance !== undefined && distance !== null && (
                <div className="flex items-center space-x-1 text-textSecondaryLight">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span>{t('explore.card.distanceAway', { distance })}</span>
                </div>
              )}
            </div>
          </div>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="cosmic-chip text-xs"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span className="cosmic-chip text-xs">
                  {t('explore.card.moreTags', { count: tags.length - 4 })}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
