import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  DollarSign,
  Users,
  ArrowRight
} from 'lucide-react';

interface EventCardProps {
  event: {
    eventId: string;
    eventName: string;
    description: string | null;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isDropIn: boolean;
    locationName: string | null;
    address: string | null;
    distance: number | null;
    ageMin: number | null;
    ageMax: number | null;
    cost: string | null;
    costCents: number;
    programId: string;
    programTitle: string;
    programDescription: string | null;
    programTags?: string[];
    organizer: string | null;
  };
}

export default function EventCard({ event }: EventCardProps) {
  const formatTime = (time: string) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  return (
    <Link to={`/program/${event.programId}`}>
      <motion.div
        className="cosmic-card p-5 hover:shadow-soft transition-all duration-200"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-deepSage text-lg leading-tight flex-1">
                {event.eventName || event.programTitle}
              </h3>
              {event.isDropIn && (
                <span className="cosmic-chip text-xs bg-teal/10 text-teal border-teal/20 flex-shrink-0">
                  Drop-in
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                {event.dayOfWeek && `${event.dayOfWeek}, `}
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </span>
            </div>
          </div>

          {event.locationName && (
            <div className="space-y-1">
              <div className="flex items-start gap-2 text-sm text-deepSage">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{event.locationName}</div>
                  {event.address && (
                    <div className="text-textSecondaryLight text-xs mt-0.5">
                      {event.address}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-textSecondaryLight">
            {event.distance !== null && event.distance !== undefined && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{event.distance.toFixed(1)} km away</span>
              </div>
            )}
            
            {(event.ageMin || event.ageMax) && (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {event.ageMin && event.ageMax ? `Ages ${event.ageMin}-${event.ageMax}` : 
                   event.ageMin ? `Ages ${event.ageMin}+` : 
                   `Up to age ${event.ageMax}`}
                </span>
              </div>
            )}
            
            <div className={`flex items-center gap-1 ${
              event.cost === 'Free' || event.costCents === 0 ? 'text-teal font-medium' : ''
            }`}>
              <DollarSign className="w-3.5 h-3.5" />
              <span>
                {event.cost === 'Free' || event.costCents === 0 ? 'Free' : 
                 event.costCents ? `$${(event.costCents / 100).toFixed(2)}` : 
                 'Cost varies'}
              </span>
            </div>
          </div>

          {(event.description || event.programDescription) && (
            <p className="text-sm text-textSecondaryLight line-clamp-2">
              {event.description || event.programDescription}
            </p>
          )}

          {event.programTags && Array.isArray(event.programTags) && event.programTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.programTags.slice(0, 3).map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="cosmic-chip text-xs"
                >
                  {tag}
                </span>
              ))}
              {event.programTags.length > 3 && (
                <span className="cosmic-chip text-xs">
                  +{event.programTags.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center gap-2 text-teal text-sm font-medium">
            <span>View Program</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
