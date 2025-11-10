import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, AlertCircle, RefreshCcw } from 'lucide-react';
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

export default function TodayList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [currentTime, setCurrentTime] = useState(new Date());

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
      const response = await api.events.happeningNow(lat, lng);

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
            No programs happening right now
          </h3>
          <p className="text-sm text-textSecondaryLight">
            Check back during program hours (weekdays 8am-8pm, weekends vary) or explore upcoming programs.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm font-medium text-deepSage">
            {events.length} {events.length === 1 ? 'program' : 'programs'} happening now
          </div>
          {events.map((event) => (
            <EventCard key={event.eventId} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
