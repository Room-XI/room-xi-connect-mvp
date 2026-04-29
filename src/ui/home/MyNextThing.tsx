import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, MapPin, ArrowRight } from 'lucide-react';
import { useSession } from '@/lib/session';

interface ScheduleItem {
  title?: string;
  programName?: string;
  programId?: string;
  start?: string;
  venue?: string;
}

export default function MyNextThing() {
  const { user } = useSession();
  const [nextItem, setNextItem] = useState<ScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNextItem(null);
      setLoading(false);
      return;
    }

    const fetchNextThing = async () => {
      try {
        const response = await fetch('/api/tools/my-schedule', { credentials: 'include' });
        const data = await response.json();

        if (data.schedule && data.schedule.length > 0) {
          setNextItem(data.schedule[0]);
        } else {
          setNextItem(null);
        }
      } catch (err) {
        console.error('Error fetching next thing:', err);
        setNextItem(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNextThing();
  }, [user]);

  if (!user || loading || !nextItem) return null;

  const displayTitle = nextItem.title || nextItem.programName || 'Upcoming Program';
  const formattedDate = nextItem.start
    ? new Date(nextItem.start).toLocaleDateString('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        to={nextItem.programId ? `/program/${nextItem.programId}` : '/explore/saved'}
        className="block"
      >
        <div className="bg-gradient-to-r from-teal/10 to-sage/10 border border-teal/20 rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal" />
                <span className="text-xs font-semibold text-teal uppercase tracking-wide">
                  My Next Thing
                </span>
              </div>
              <h3 className="font-semibold text-deepSage">{displayTitle}</h3>
              {formattedDate && (
                <p className="text-sm text-textSecondaryLight">{formattedDate}</p>
              )}
              {nextItem.venue && (
                <p className="text-sm text-textSecondaryLight flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {nextItem.venue}
                </p>
              )}
            </div>
            <ArrowRight className="w-5 h-5 text-teal flex-shrink-0" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
