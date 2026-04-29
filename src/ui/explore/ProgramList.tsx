import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import FilterBar, { Filters } from './FilterBar';
import ProgramCard from './ProgramCard';
import api from '@/lib/api';

interface WeeklySchedule {
  days: string[];
  startTime: string;
  endTime: string;
  location: string | null;
  isDropIn?: boolean;
}

interface GroupedProgram {
  programId: string;
  programTitle: string;
  programDescription: string | null;
  programTags: string[];
  wellnessDimensions: string[];
  organizer: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  locationName: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  ageMin: number | null;
  ageMax: number | null;
  free: boolean;
  costCents: number;
  isDropIn: boolean;
  indoor: boolean;
  outdoor: boolean;
  timesOfDay: string[];
  distance: number | null;
  weeklySchedule: WeeklySchedule[];
  scheduleSummary: string;
}

interface ProgramListProps {
  userLocation: { lat: number; lng: number } | null;
  locationPermission: 'granted' | 'denied' | 'prompt';
  locationEnabled: boolean;
  radiusKm?: number;
  quickFilters?: Set<string>;
}

export default function ProgramList({ userLocation, locationPermission, locationEnabled, radiusKm = 2, quickFilters }: ProgramListProps) {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<GroupedProgram[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<GroupedProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    tags: [] as string[],
    categories: [] as string[],
    free: false,
    indoor: false,
    outdoor: false,
    timeOfDay: undefined,
    dropIn: undefined,
    maxDistance: undefined,
    ageRange: 'all',
    cost: 'all',
  });

  useEffect(() => {
    loadPrograms();
  }, [userLocation, locationEnabled]);

  useEffect(() => {
    applyFilters();
  }, [programs, filters, radiusKm, locationEnabled, userLocation, quickFilters]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      
      const lat = locationEnabled && userLocation ? userLocation.lat : undefined;
      const lng = locationEnabled && userLocation ? userLocation.lng : undefined;
      const { data, error } = await api.programOccurrences.grouped(lat, lng);

      if (error) {
        console.error('Error loading programs:', error);
        return;
      }

      setPrograms(data?.programs || []);
    } catch (error) {
      console.error('Unexpected error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...programs];

    if (quickFilters?.has('free') || filters.free) {
      filtered = filtered.filter(program => program.costCents === 0 || program.free);
    }

    if (quickFilters?.has('dropIn') || filters.dropIn) {
      filtered = filtered.filter(program => program.isDropIn);
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(program =>
        filters.tags.some(tag => program.programTags?.includes(tag))
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(program =>
        filters.categories.some(category => program.programTags?.includes(category))
      );
    }

    if (filters.indoor) {
      filtered = filtered.filter(program => program.indoor === true);
    }

    if (filters.outdoor) {
      filtered = filtered.filter(program => program.outdoor === true);
    }

    if (filters.timeOfDay && filters.timeOfDay.length > 0) {
      filtered = filtered.filter(program =>
        program.timesOfDay?.some(time => filters.timeOfDay?.includes(time))
      );
    }

    if (filters.ageRange && filters.ageRange !== 'all') {
      filtered = filtered.filter(program => {
        if (program.ageMin === null && program.ageMax === null) return true;
        
        let minAge: number, maxAge: number;
        switch (filters.ageRange) {
          case '12-14':
            minAge = 12; maxAge = 14;
            break;
          case '15-17':
            minAge = 15; maxAge = 17;
            break;
          case '18-24':
            minAge = 18; maxAge = 24;
            break;
          case '25+':
            minAge = 25; maxAge = 100;
            break;
          default:
            return true;
        }
        
        const programMin = program.ageMin ?? 0;
        const programMax = program.ageMax ?? 100;
        return programMin <= maxAge && programMax >= minAge;
      });
    }

    if (filters.cost && filters.cost !== 'all') {
      if (filters.cost === 'free') {
        filtered = filtered.filter(program => program.costCents === 0 || program.free);
      } else if (filters.cost === 'paid') {
        filtered = filtered.filter(program => program.costCents > 0 && !program.free);
      }
    }

    if (locationEnabled && userLocation) {
      const effectiveMaxDistance = filters.maxDistance ?? radiusKm;
      if (effectiveMaxDistance > 0) {
        filtered = filtered.filter(program => 
          program.distance !== null && program.distance <= effectiveMaxDistance
        );
      }
      filtered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

    setFilteredPrograms(filtered);
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-sage/20 rounded-xl animate-pulse" />
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
      <FilterBar
        programs={programs.map(p => ({
          programTags: p.programTags,
          costCents: p.costCents,
          cost: p.free ? 'Free' : null,
          isDropIn: p.isDropIn,
          indoor: p.indoor,
          outdoor: p.outdoor,
          distance: p.distance
        }))}
        filters={filters}
        onFilterChange={handleFilterChange}
        showTimeOfDay={true}
        showDropIn={true}
        showDistance={true}
        hasLocation={locationEnabled && locationPermission === 'granted'}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-textSecondaryLight">
          {t('explore.list.programsFound', { count: filteredPrograms.length })}
        </p>
      </div>

      <AnimatePresence>
        {filteredPrograms.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="cosmic-card p-8 text-center"
          >
            <p className="text-textSecondaryLight">
              {t('explore.list.noMatchingPrograms')}
            </p>
            <button
              onClick={() => setFilters({ 
                tags: [], 
                categories: [],
                free: false, 
                indoor: false, 
                outdoor: false,
                timeOfDay: undefined,
                dropIn: undefined,
                maxDistance: undefined,
                ageRange: 'all',
                cost: 'all',
              })}
              className="mt-4 text-sm font-medium text-teal hover:text-teal/80 transition-colors"
            >
              {t('common.clearAll')}
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
            {filteredPrograms.map((program, index) => (
              <motion.div
                key={program.programId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.3 }}
              >
                <ProgramCard program={program} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
