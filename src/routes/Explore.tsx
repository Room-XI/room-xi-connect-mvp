import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, ArrowRight } from 'lucide-react';
import ExploreTabs from '@/ui/explore/ExploreTabs';
import TodayList from '@/ui/explore/TodayList';
import ProgramList from '@/ui/explore/ProgramList';
import ProgramMap from '@/ui/explore/ProgramMap';
import SavedList from '@/ui/explore/SavedList';
import XimiDock from '@/ui/explore/XimiDock';
import LocationToggle from '@/ui/explore/LocationToggle';
import CrisisSheet from '@/ui/crisis/CrisisSheet';
import { useSession } from '@/lib/session';
import { useExploreGate } from '@/hooks/useExploreGate';
import api from '@/lib/api';

export default function Explore() {
  const { view } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useSession();
  const { isGateOpen, needsCheckIn, isLoading } = useExploreGate();
  const currentView = view === 'today' ? 'today' : view === 'map' ? 'map' : view === 'saved' ? 'saved' : 'programs';
  const [crisisOpen, setCrisisOpen] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [locationEnabled, setLocationEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('locationPreference') === 'true';
  });
  const [radiusKm, setRadiusKm] = useState<number>(() => {
    if (typeof window === 'undefined') return 2;
    const saved = localStorage.getItem('locationRadiusKm');
    return saved ? parseInt(saved, 10) : 2;
  });

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Array<{
    eventId: string;
    programId: string;
    title: string;
    programTitle: string;
    matchScore: number;
    triggerReason: string;
    tags: string[];
    locationName: string | null;
    free: boolean;
    cost: string;
    dayOfWeek: string | null;
    startTime: string;
    endTime: string;
  }>>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState<boolean | null>(null);

  // 8am Gate Check - we now show a banner instead of redirecting
  const showCheckInPrompt = user && !isLoading && needsCheckIn && !isGateOpen && searchParams.get('skip_gate') !== 'true';

  // Persist locationEnabled changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPreference', locationEnabled.toString());
    }
  }, [locationEnabled]);

  // Persist radiusKm changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationRadiusKm', radiusKm.toString());
    }
  }, [radiusKm]);

  // Restore permission state from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedPermission = sessionStorage.getItem('locationPermission') as 'granted' | 'denied' | null;
    if (savedPermission) {
      setLocationPermission(savedPermission);
    }
  }, []);

  // Persist permission state changes to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (locationPermission !== 'prompt') {
      sessionStorage.setItem('locationPermission', locationPermission);
    }
  }, [locationPermission]);

  useEffect(() => {
    if (locationEnabled) {
      requestUserLocation();
    }
  }, [locationEnabled]);

  // Fetch recommendations for authenticated users with check-ins
  useEffect(() => {
    if (!user) {
      setRecommendations([]);
      setHasCheckedIn(false);
      return;
    }

    const fetchRecommendations = async () => {
      setRecommendationsLoading(true);
      try {
        const lat = locationEnabled && userLocation ? userLocation.lat : undefined;
        const lng = locationEnabled && userLocation ? userLocation.lng : undefined;
        const { data, error } = await api.events.recommendations(lat, lng);
        
        if (error) {
          console.error('Failed to fetch recommendations:', error);
          setHasCheckedIn(false);
          setRecommendations([]);
          return;
        }

        if (data) {
          setRecommendations(data.recommendations || []);
          setHasCheckedIn(data.recommendations.length > 0 || !data.message);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setHasCheckedIn(false);
        setRecommendations([]);
      } finally {
        setRecommendationsLoading(false);
      }
    };

    fetchRecommendations();
  }, [user, userLocation, locationEnabled]);

  const requestUserLocation = () => {
    const cachedLocation = sessionStorage.getItem('userLocation');
    if (cachedLocation) {
      const { lat, lng } = JSON.parse(cachedLocation);
      setUserLocation({ lat, lng });
      setLocationPermission('granted');
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationPermission('denied');
      setLocationEnabled(false);
      return;
    }

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
        setLocationEnabled(false);
      }
    );
  };

  const handleLocationToggle = () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      setUserLocation(null);
    } else {
      setLocationEnabled(true);
    }
  };

  const handleRetryLocation = () => {
    // Clear cached location and permission to force a fresh request
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('userLocation');
      sessionStorage.removeItem('locationPermission');
    }
    setLocationPermission('prompt');
    setUserLocation(null);
    setLocationEnabled(true);
  };

  return (
    <>
      <motion.div
        className="py-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-display font-bold text-deepSage">
            Explore
          </h1>
          <p className="text-textSecondaryLight">
            Discover programs, events, and activities in your community
          </p>
        </div>

        {/* Check-in Required Gate - blocks content for authenticated users who haven't checked in */}
        {showCheckInPrompt && (
          <motion.div
            className="cosmic-card p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-amber-800 mb-2">
              Complete a quick check-in to unlock Explore
            </h2>
            <p className="text-sm text-amber-700 mb-4 max-w-md mx-auto">
              Take a moment to share how you're feeling today. It only takes a few seconds and helps us support you better!
            </p>
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Do my check-in
            </button>
          </motion.div>
        )}

        {/* Guest Notice Banner */}
        {!user && (
          <motion.div
            className="cosmic-card p-4 bg-gradient-to-r from-teal/10 to-sage/10 border-l-4 border-teal"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 mt-0.5 text-teal">
                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-deepSage">
                  Sign in to see all upcoming programs
                </p>
                <p className="text-sm text-textSecondaryLight">
                  Guests can browse today's programs only. Create an account or sign in to view all future programs and events.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recommended for You Section - Only for authenticated users with check-ins */}
        {user && hasCheckedIn && !showCheckInPrompt && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal" />
              <h2 className="text-lg font-semibold text-deepSage">Recommended for You</h2>
            </div>

            {recommendationsLoading ? (
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="cosmic-card p-4 animate-pulse">
                    <div className="space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded-full w-16" />
                        <div className="h-6 bg-gray-200 rounded-full w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid gap-3">
                {recommendations.map((rec) => (
                  <motion.div
                    key={rec.eventId}
                    className="cosmic-card p-4 hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-deepSage">{rec.programTitle}</h3>
                        <p className="text-sm text-textSecondaryLight mt-1 line-clamp-2">
                          {rec.triggerReason}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {rec.locationName && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-sage/10 text-sage rounded-full">
                            <MapPin className="w-3 h-3" />
                            {rec.locationName}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full ${rec.free ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {rec.free ? 'Free' : rec.cost}
                        </span>
                      </div>

                      <Link
                        to={`/program/${rec.programId}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:text-teal/80 transition-colors"
                      >
                        View Program
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* Only show Explore content if gate is open or user is not required to check in */}
        {!showCheckInPrompt && (
          <>
            {/* Location Toggle */}
            <LocationToggle
              enabled={locationEnabled}
              onToggle={handleLocationToggle}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              permissionState={locationPermission}
              onRetryPermission={handleRetryLocation}
            />

            {/* Segmented Control */}
            <ExploreTabs current={currentView} />
            
            {/* Content based on current view */}
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              {currentView === 'today' && (
                <TodayList
                  userLocation={userLocation}
                  locationPermission={locationPermission}
                  locationEnabled={locationEnabled}
                  radiusKm={radiusKm}
                />
              )}
              {currentView === 'programs' && (
                <ProgramList
                  userLocation={userLocation}
                  locationPermission={locationPermission}
                  locationEnabled={locationEnabled}
                  radiusKm={radiusKm}
                />
              )}
              {currentView === 'map' && (
                <ProgramMap
                  userLocation={userLocation}
                  locationEnabled={locationEnabled}
                  radiusKm={radiusKm}
                />
              )}
              {currentView === 'saved' && <SavedList />}
            </motion.div>
          </>
        )}

        {/* Footer Links Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Room XI is committed to transparency and privacy protection
            </p>
            <a
              href="/transparency"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-teal hover:text-teal-700 hover:underline transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Transparency Dashboard
            </a>
            <p className="text-xs text-gray-500">
              See aggregated community statistics with privacy protection
            </p>
          </div>
        </div>
        
        {/* Spacer for floating dock */}
        <div className="h-32" />
      </motion.div>
      
      {/* Ximi Dock - Floating AI assistant (authenticated users only) */}
      {user && <XimiDock onCrisis={() => setCrisisOpen(true)} />}
      
      {/* Crisis Support Sheet */}
      <CrisisSheet open={crisisOpen} onClose={() => setCrisisOpen(false)} />
    </>
  );
}
