import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, AlertCircle, RefreshCcw } from 'lucide-react';
import api from '@/lib/api';
import EventCard from '@/components/EventCard';
import FilterBar from './FilterBar';

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

interface Filters {
  tags: string[];
  free: boolean;
  timeOfDay?: string[];
  dropIn?: boolean;
  maxDistance?: number | null;
}

export default function TodayList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filters, setFilters] = useState<Filters>({
    tags: [],
    free: false,
    timeOfDay: [],
    dropIn: false,
    maxDistance: null,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    requestUserLocation();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [userLocation]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const parseTimeToHour = (timeString: string): number => {
    const [hours] = timeString.split(':').map(Number);
    return hours;
  };

  const categorizeTimeOfDay = (startTime: string): string => {
    const hour = parseTimeToHour(startTime);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (filters.tags.length > 0) {
      filtered = filtered.filter(event =>
        filters.tags.some(tag => event.programTags?.includes(tag))
      );
    }

    if (filters.free) {
      filtered = filtered.filter(event => 
        event.costCents === 0 || event.cost === 'Free'
      );
    }

    if (filters.timeOfDay && filters.timeOfDay.length > 0) {
      filtered = filtered.filter(event => {
        const eventTimeOfDay = categorizeTimeOfDay(event.startTime);
        return filters.timeOfDay!.includes(eventTimeOfDay);
      });
    }

    if (filters.dropIn) {
      filtered = filtered.filter(event => event.isDropIn === true);
    }

    if (filters.maxDistance !== null && filters.maxDistance !== undefined && filters.maxDistance > 0 && userLocation) {
      filtered = filtered.filter(event => 
        event.distance !== null && event.distance <= filters.maxDistance!
      );
    }

    setFilteredEvents(filtered);
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const hasActiveFilters = () => {
    return filters.tags.length > 0 || 
           filters.free || 
           (filters.timeOfDay && filters.timeOfDay.length > 0) ||
           filters.dropIn || 
           (filters.maxDistance !== null && filters.maxDistance !== undefined && filters.maxDistance > 0);
  };

  const requestUserLocation = () => {
    const cachedLocation = sessionStorage.getItem('userLocation');
    if (cachedLocation) {
      const { lat, lng } = JSON.parse(cachedLocation);
      setUserLocation({ lat, lng });
      setLocationPermission('granted');
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setLocationPermission('granted');
          sessionStorage.setItem('userLocation', JSON.stringify(location));
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationPermission('denied');
        }
      );
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const lat = userLocation?.lat;
      const lng = userLocation?.lng;
      const response = await api.events.today(lat, lng);

      if (response.error) {
        setError(response.error);
        setEvents([]);
      } else {
        setEvents(response.data?.events || []);
      }
    } catch (err) {
      setError('Failed to load events. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-coral" />
        <h3 className="text-lg font-semibold text-deepSage mb-2">
          Unable to load events
        </h3>
        <p className="text-sm text-textSecondaryLight mb-4">{error}</p>
        <button
          onClick={fetchEvents}
          className="cosmic-button-secondary inline-flex items-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
          <Clock className="w-4 h-4" />
          <span>{formatCurrentTime()}</span>
        </div>
        {locationPermission === 'denied' && (
          <button
            onClick={requestUserLocation}
            className="text-xs text-teal hover:underline flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            Enable location
          </button>
        )}
      </div>

      {events.length > 0 && (
        <FilterBar
          programs={events}
          filters={filters}
          onFilterChange={handleFilterChange}
          showTimeOfDay={true}
          showDropIn={true}
          showDistance={true}
          hasLocation={locationPermission === 'granted'}
        />
      )}

      {events.length === 0 ? (
        <motion.div
          className="cosmic-card p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal/20 to-sage/20 flex items-center justify-center">
            <Clock className="w-8 h-8 text-teal" />
          </div>
          <h3 className="text-lg font-semibold text-deepSage mb-2">
            No programs scheduled today
          </h3>
          <p className="text-sm text-textSecondaryLight">
            Check the Programs tab to browse all upcoming events, or try again tomorrow.
          </p>
        </motion.div>
      ) : filteredEvents.length === 0 ? (
        <motion.div
          className="cosmic-card p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal/20 to-sage/20 flex items-center justify-center">
            <Clock className="w-8 h-8 text-teal" />
          </div>
          <h3 className="text-lg font-semibold text-deepSage mb-2">
            No events match your filters
          </h3>
          <p className="text-sm text-textSecondaryLight mb-4">
            Try adjusting your filters to see more events.
          </p>
          <button
            onClick={() => setFilters({ tags: [], free: false, timeOfDay: [], dropIn: false, maxDistance: null })}
            className="cosmic-button-secondary"
          >
            Clear all filters
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm font-medium text-deepSage">
            {hasActiveFilters() 
              ? `${filteredEvents.length} of ${events.length} events`
              : `${events.length} ${events.length === 1 ? 'event' : 'events'} today`
            }
          </div>
          {filteredEvents.map((event) => (
            <EventCard key={event.eventId} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
