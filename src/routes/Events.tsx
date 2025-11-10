import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, AlertCircle, RefreshCcw } from 'lucide-react';
import api from '@/lib/api';
import EventCard from '@/components/EventCard';

type TabType = 'happening-now' | 'today' | 'weekend' | 'later';

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

export default function Events() {
  const [activeTab, setActiveTab] = useState<TabType>('happening-now');
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
  }, [activeTab, userLocation]);

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
      let response;
      const lat = userLocation?.lat;
      const lng = userLocation?.lng;

      switch (activeTab) {
        case 'happening-now':
          response = await api.events.happeningNow(lat, lng);
          break;
        case 'today':
          response = await api.events.today(lat, lng);
          break;
        case 'weekend':
          response = await api.events.thisWeekend(lat, lng);
          break;
        case 'later':
          response = await api.events.later(lat, lng);
          break;
      }

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
    });
  };

  const getEmptyStateMessage = () => {
    switch (activeTab) {
      case 'happening-now':
        return 'No programs happening right now';
      case 'today':
        return 'No programs scheduled for today';
      case 'weekend':
        return 'No programs scheduled this weekend';
      case 'later':
        return 'No upcoming programs scheduled';
      default:
        return 'No programs found';
    }
  };

  const tabs = [
    { id: 'happening-now' as TabType, label: 'Happening Now' },
    { id: 'today' as TabType, label: 'Today' },
    { id: 'weekend' as TabType, label: 'This Weekend' },
    { id: 'later' as TabType, label: 'Later' },
  ];

  return (
    <motion.div
      className="py-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-deepSage">
              Events
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-textSecondaryLight">
              <Calendar className="w-4 h-4" />
              <span>{formatCurrentTime()}</span>
            </div>
          </div>
          {locationPermission === 'denied' && (
            <button
              onClick={requestUserLocation}
              className="flex items-center gap-2 px-3 py-2 text-sm text-teal hover:text-teal-700 transition-colors"
              aria-label="Enable location for distance sorting"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Enable Location</span>
            </button>
          )}
        </div>

        {locationPermission === 'denied' && (
          <motion.div
            className="cosmic-card p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 mt-0.5 text-amber-700" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-amber-900">
                  Location access disabled
                </p>
                <p className="text-sm text-amber-700">
                  Enable location to see events sorted by distance from you.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-teal text-white shadow-sm'
                  : 'bg-surface text-textSecondaryLight hover:bg-sage/10 hover:text-deepSage'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cosmic-card p-5 animate-pulse">
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <motion.div
          className="cosmic-card p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-deepSage mb-2">
            Something went wrong
          </h3>
          <p className="text-textSecondaryLight mb-6">{error}</p>
          <button
            onClick={fetchEvents}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </button>
        </motion.div>
      ) : events.length === 0 ? (
        <motion.div
          className="cosmic-card p-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage/10 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-sage" />
          </div>
          <h3 className="text-lg font-semibold text-deepSage mb-2">
            {getEmptyStateMessage()}
          </h3>
          <p className="text-textSecondaryLight max-w-md mx-auto">
            Check back later or try a different time filter to see available programs.
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {events.map((event, index) => {
            try {
              return (
                <motion.div
                  key={event.eventId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EventCard event={event} />
                </motion.div>
              );
            } catch (err) {
              console.error('Error rendering event card:', err, event);
              return (
                <div key={event.eventId} className="cosmic-card p-5 bg-red-50">
                  <p className="text-red-600">Error rendering event: {event.eventName || 'Unknown'}</p>
                  <pre className="text-xs">{JSON.stringify(err, null, 2)}</pre>
                </div>
              );
            }
          })}
        </motion.div>
      )}

      <div className="h-24" />
    </motion.div>
  );
}
