import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import FilterBar, { Filters } from './FilterBar';
import ProgramCard from './ProgramCard';
import api from '@/lib/api';

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

export default function ProgramList() {
  const [events, setEvents] = useState<ProgramEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ProgramEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [filters, setFilters] = useState<Filters>({
    tags: [] as string[],
    free: false,
    indoor: false,
    outdoor: false,
    timeOfDay: undefined,
    dropIn: undefined,
    maxDistance: undefined,
  });

  useEffect(() => {
    requestUserLocation();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [userLocation]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

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

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      const lat = userLocation?.lat;
      const lng = userLocation?.lng;
      const { data, error } = await api.programOccurrences.list(lat, lng);

      if (error) {
        console.error('Error loading program events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Unexpected error loading program events:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(event =>
        filters.tags.some(tag => event.programTags?.includes(tag))
      );
    }

    // Filter by free
    if (filters.free) {
      filtered = filtered.filter(event => event.costCents === 0 || event.cost === 'Free');
    }

    setFilteredEvents(filtered);
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-sage/10 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="cosmic-card p-4 animate-pulse">
              <div className="space-y-3">
                <div className="h-5 bg-sage/10 rounded" />
                <div className="h-4 bg-sage/10 rounded w-3/4" />
                <div className="flex space-x-2">
                  <div className="h-6 bg-sage/10 rounded-full w-16" />
                  <div className="h-6 bg-sage/10 rounded-full w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <FilterBar
        programs={events}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Results Count and Location Permission */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-textSecondaryLight">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
        </p>
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

      {/* Event List */}
      <AnimatePresence>
        {filteredEvents.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="cosmic-card p-8 text-center"
          >
            <p className="text-textSecondaryLight">
              No events match your current filters.
            </p>
            <button
              onClick={() => setFilters({ 
                tags: [], 
                free: false, 
                indoor: false, 
                outdoor: false,
                timeOfDay: undefined,
                dropIn: undefined,
                maxDistance: undefined,
              })}
              className="mt-4 text-sm font-medium text-teal hover:text-teal/80 transition-colors"
            >
              Clear all filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.eventId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.3 }}
              >
                <ProgramCard event={event} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
