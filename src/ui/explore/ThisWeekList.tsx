import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertCircle, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import EventCard from '@/components/EventCard';

interface Event {
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
  programTags: string[];
  organizer: string | null;
}

interface ThisWeekListProps {
  userLocation: { lat: number; lng: number } | null;
  locationPermission: 'granted' | 'denied' | 'prompt';
  locationEnabled: boolean;
  radiusKm?: number;
  quickFilters?: Set<string>;
}

export default function ThisWeekList({ userLocation, locationPermission: _locationPermission, locationEnabled, radiusKm = 2, quickFilters }: ThisWeekListProps) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [userLocation, locationEnabled, radiusKm, quickFilters]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const lat = locationEnabled && userLocation ? userLocation.lat : undefined;
      const lng = locationEnabled && userLocation ? userLocation.lng : undefined;
      const response = await api.events.thisWeek(lat, lng);

      if (response.error) {
        setError(response.error);
        setEvents([]);
      } else {
        let result = response.data?.events || [];
        if (locationEnabled && userLocation && radiusKm > 0) {
          result = result.filter((e: Event) => e.distance === null || e.distance <= radiusKm);
        }
        if (quickFilters?.has('free')) {
          result = result.filter((e: Event) => e.costCents === 0);
        }
        if (quickFilters?.has('dropIn')) {
          result = result.filter((e: Event) => e.isDropIn);
        }
        setEvents(result);
      }
    } catch (err) {
      setError('Failed to load events. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="cosmic-card p-5 animate-pulse">
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="cosmic-card p-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-coralText" />
        <h3 className="text-lg font-semibold text-deepSage mb-2">
          {t('explore.thisWeek.unableToLoad', { defaultValue: 'Unable to load events' })}
        </h3>
        <p className="text-sm text-textSecondaryLight mb-4">{error}</p>
        <button
          onClick={fetchEvents}
          className="cosmic-button-secondary inline-flex items-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          {t('common.tryAgain')}
        </button>
      </motion.div>
    );
  }

  if (events.length === 0) {
    return (
      <motion.div
        className="cosmic-card p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal/20 to-sage/20 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-teal" />
        </div>
        <h3 className="text-lg font-semibold text-deepSage mb-2">
          {t('explore.thisWeek.noEvents', { defaultValue: 'No events this week' })}
        </h3>
        <p className="text-sm text-textSecondaryLight">
          {t('explore.thisWeek.noEventsDescription', { defaultValue: 'Check back soon for new programs and events.' })}
        </p>
      </motion.div>
    );
  }

  const grouped: Record<string, Event[]> = {};
  events.forEach(event => {
    const day = event.dayOfWeek || 'Other';
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(event);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
        <Calendar className="w-4 h-4" />
        <span>{t('explore.thisWeek.eventCount', { count: events.length, defaultValue: '{{count}} event(s) this week' })}</span>
      </div>

      {Object.entries(grouped).map(([day, dayEvents]) => (
        <div key={day} className="space-y-3">
          <h3 className="text-sm font-semibold text-deepSage border-b border-borderMutedLight pb-1">
            {day}
          </h3>
          {dayEvents.map((event) => (
            <EventCard key={event.eventId} event={event} />
          ))}
        </div>
      ))}
    </div>
  );
}
