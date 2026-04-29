import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { MapPin, ExternalLink, List, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const UserIcon = L.divIcon({
  className: 'user-location-marker',
  html: '<div class="w-4 h-4 bg-teal rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Program {
  id: string;
  title: string;
  description: string | null;
  organizer: string | null;
  locationName: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  tags: string[];
  free: boolean;
  distance?: number;
}

interface ProgramMapProps {
  userLocation?: { lat: number; lng: number } | null;
  locationEnabled?: boolean;
  radiusKm?: number;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ProgramMap({ userLocation, locationEnabled = false, radiusKm = 2 }: ProgramMapProps) {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  const defaultCenter: [number, number] = [53.5461, -113.4938];

  useEffect(() => {
    loadProgramsWithLocation();
  }, []);

  const loadProgramsWithLocation = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await api.programs.list();

      if (error) {
        console.error('Error loading programs with location:', error);
        return;
      }

      const validPrograms = (data || []).filter((program: any) => {
        const lat = program.lat ? parseFloat(program.lat) : NaN;
        const lng = program.lng ? parseFloat(program.lng) : NaN;
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      }).slice(0, 50);

      setPrograms(validPrograms);
    } catch (error) {
      console.error('Unexpected error loading programs:', error);
      setMapError(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = useMemo(() => {
    if (!locationEnabled || !userLocation) {
      return programs;
    }

    return programs
      .map(program => {
        const lat = parseFloat(program.lat!);
        const lng = parseFloat(program.lng!);
        const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        return { ...program, distance };
      })
      .filter(program => program.distance <= radiusKm)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [programs, userLocation, locationEnabled, radiusKm]);

  const mapCenter: [number, number] = userLocation && locationEnabled 
    ? [userLocation.lat, userLocation.lng] 
    : defaultCenter;

  const mapZoom = locationEnabled && userLocation 
    ? (radiusKm <= 1 ? 14 : radiusKm <= 2 ? 13 : 12)
    : 11;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="cosmic-card p-6">
          <div className="h-64 bg-sage/20 rounded-xl animate-pulse flex items-center justify-center">
            <MapPin className="w-8 h-8 text-sage/50" />
          </div>
        </div>
        <div className="text-center text-sm text-textSecondaryLight">
          {t('explore.map.loading')}
        </div>
      </div>
    );
  }

  if (mapError || programs.length === 0) {
    return (
      <div className="cosmic-card p-8 text-center space-y-4">
        <MapPin className="w-12 h-12 text-sage/50 mx-auto" />
        <div className="space-y-2">
          <h3 className="font-semibold text-deepSage">
            {mapError ? t('explore.map.unavailable') : t('explore.map.noLocations')}
          </h3>
          <p className="text-textSecondaryLight">
            {mapError 
              ? t('explore.map.unavailableDescription')
              : t('explore.map.noLocationsDescription')
            }
          </p>
        </div>
        <Link
          to="/explore"
          className="inline-block text-sm font-medium text-teal hover:text-teal/80 transition-colors"
        >
          {t('explore.map.viewAllPrograms')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div
        className="cosmic-card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="h-80 w-full">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            className="rounded-xl"
          >
            <MapController center={mapCenter} zoom={mapZoom} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            
            {locationEnabled && userLocation && (
              <>
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: '#147A4D',
                    fillColor: '#147A4D',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                />
                <Marker 
                  position={[userLocation.lat, userLocation.lng]} 
                  icon={UserIcon}
                />
              </>
            )}
            
            {filteredPrograms.map(program => {
              const lat = parseFloat(program.lat!);
              const lng = parseFloat(program.lng!);
              
              return (
                <Marker key={program.id} position={[lat, lng]}>
                  <Popup>
                    <div className="space-y-2 min-w-48">
                      <h4 className="font-semibold text-deepSage">
                        {program.title}
                      </h4>
                      
                      {program.organizer && (
                        <p className="text-sm text-textSecondaryLight">
                          {t('explore.card.by', { organizer: program.organizer })}
                        </p>
                      )}
                      
                      {program.locationName && (
                        <p className="text-sm text-textSecondaryLight flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {program.locationName}
                        </p>
                      )}

                      {program.distance !== undefined && (
                        <p className="text-sm text-teal font-medium">
                          {t('explore.card.distanceAway', { distance: program.distance.toFixed(1) })}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        {program.free && (
                          <span className="text-xs font-medium text-teal">
                            {t('programs.free')}
                          </span>
                        )}
                        
                        <Link
                          to={`/program/${program.id}`}
                          className="text-xs font-medium text-teal hover:text-teal/80 transition-colors flex items-center space-x-1"
                        >
                          <span>{t('explore.viewDetails')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </motion.div>

      <motion.div
        className="cosmic-card p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-teal" />
            <span className="text-sm font-medium text-deepSage">
              {locationEnabled && userLocation 
                ? t('explore.map.programsWithinRadius', { count: filteredPrograms.length, radius: radiusKm })
                : t('explore.map.programsCount', { count: filteredPrograms.length })
              }
            </span>
          </div>
          
          {locationEnabled && userLocation && (
            <div className="flex items-center space-x-1 text-xs text-textSecondaryLight">
              <Navigation className="w-3 h-3" />
              <span>{t('explore.map.yourLocation')}</span>
            </div>
          )}
        </div>
      </motion.div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-deepSage">
            {locationEnabled && userLocation ? t('explore.map.nearbyPrograms') : t('explore.map.programsOnMap')}
          </h3>
          <Link 
            to="/explore/programs"
            className="text-sm text-teal hover:text-teal/80 flex items-center gap-1"
          >
            <List className="w-4 h-4" />
            {t('explore.map.listView')}
          </Link>
        </div>
        <div className="space-y-2">
          {filteredPrograms.slice(0, 10).map((program, index) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
            >
              <Link to={`/program/${program.id}`}>
                <div className="cosmic-card p-4 hover:shadow-soft transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="font-medium text-deepSage truncate">
                        {program.title}
                      </h4>
                      <p className="text-sm text-textSecondaryLight truncate">
                        {program.locationName || program.address}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                      {program.distance !== undefined && (
                        <span className="text-xs font-medium text-sageText bg-sage/10 px-2 py-1 rounded-full">
                          {program.distance.toFixed(1)}km
                        </span>
                      )}
                      {program.free && (
                        <span className="text-xs font-medium text-teal bg-teal/10 px-2 py-1 rounded-full">
                          {t('programs.free')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          {filteredPrograms.length > 10 && (
            <p className="text-center text-sm text-textSecondaryLight py-2">
              {t('explore.map.morePrograms', { count: filteredPrograms.length - 10 })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
