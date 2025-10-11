import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Program {
  id: string;
  title: string;
  description: string | null;
  organizer: string | null;
  location_name: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  tags: string[];
  free: boolean;
}

export default function ProgramMap() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  // Edmonton coordinates as default center
  const defaultCenter: [number, number] = [53.5461, -113.4938];

  useEffect(() => {
    loadProgramsWithLocation();
  }, []);

  const loadProgramsWithLocation = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('programs')
        .select('id, title, description, organizer, location_name, address, lat, lng, tags, free')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(50); // Prevent large fetches

      if (error) {
        console.error('Error loading programs with location:', error);
        return;
      }

      // Filter out programs with invalid coordinates
      const validPrograms = (data || []).filter(program => {
        const lat = parseFloat(program.lat!);
        const lng = parseFloat(program.lng!);
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      });

      setPrograms(validPrograms);
    } catch (error) {
      console.error('Unexpected error loading programs:', error);
      setMapError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="cosmic-card p-6">
          <div className="h-64 bg-sage/10 rounded-xl animate-pulse flex items-center justify-center">
            <MapPin className="w-8 h-8 text-sage/50" />
          </div>
        </div>
        <div className="text-center text-sm text-textSecondaryLight">
          Loading map...
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
            {mapError ? 'Map Unavailable' : 'No Programs with Locations'}
          </h3>
          <p className="text-textSecondaryLight">
            {mapError 
              ? 'Unable to load the map. Please try again later.'
              : 'No programs have location data available for mapping.'
            }
          </p>
        </div>
        <Link
          to="/explore"
          className="inline-block text-sm font-medium text-teal hover:text-teal/80 transition-colors"
        >
          View all programs →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map */}
      <motion.div
        className="cosmic-card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="h-80 w-full">
          <MapContainer
            center={defaultCenter}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            className="rounded-xl"
          >
            <TileLayer
              url={import.meta.env.VITE_MAP_TILES_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
              attribution={import.meta.env.VITE_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors"}
            />
            
            {programs.map(program => {
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
                          by {program.organizer}
                        </p>
                      )}
                      
                      {program.location_name && (
                        <p className="text-sm text-textSecondaryLight">
                          📍 {program.location_name}
                        </p>
                      )}
                      
                      {program.description && (
                        <p className="text-sm text-textSecondaryLight line-clamp-2">
                          {program.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        {program.free && (
                          <span className="text-xs font-medium text-teal">
                            Free
                          </span>
                        )}
                        
                        <Link
                          to={`/program/${program.id}`}
                          className="text-xs font-medium text-teal hover:text-teal/80 transition-colors flex items-center space-x-1"
                        >
                          <span>View details</span>
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

      {/* Map Info */}
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
              {programs.length} program{programs.length !== 1 ? 's' : ''} with locations
            </span>
          </div>
          
          <p className="text-xs text-textSecondaryLight">
            Tap markers for details
          </p>
        </div>
      </motion.div>

      {/* Program List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-deepSage">Programs on Map</h3>
        <div className="space-y-2">
          {programs.map((program, index) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <Link to={`/program/${program.id}`}>
                <div className="cosmic-card p-4 hover:shadow-soft transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium text-deepSage">
                        {program.title}
                      </h4>
                      <p className="text-sm text-textSecondaryLight">
                        {program.location_name || program.address}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {program.free && (
                        <span className="text-xs font-medium text-teal bg-teal/10 px-2 py-1 rounded-full">
                          Free
                        </span>
                      )}
                      <ExternalLink className="w-4 h-4 text-textSecondaryLight" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
