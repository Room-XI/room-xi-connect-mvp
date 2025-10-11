import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterBar from './FilterBar';
import ProgramCard from './ProgramCard';
import { supabase } from '@/lib/supabase';

interface Program {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  free: boolean;
  indoor: boolean | null;
  outdoor: boolean | null;
  cost_cents: number | null;
  location_name: string | null;
  address: string | null;
  organizer: string | null;
  accessibility_notes: string | null;
  next_start: string | null;
  next_end: string | null;
}

export default function ProgramList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tags: [] as string[],
    free: false,
    indoor: false,
    outdoor: false,
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [programs, filters]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      
      // Fix for R-06: Unauthenticated Endpoint Exposure - limit query size
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .limit(50) // Prevent accidentally fetching thousands of records
        .order('next_start', { ascending: true, nullsLast: true });

      if (error) {
        console.error('Error loading programs:', error);
        return;
      }

      setPrograms(data || []);
    } catch (error) {
      console.error('Unexpected error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...programs];

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(program =>
        filters.tags.some(tag => program.tags.includes(tag))
      );
    }

    // Filter by free
    if (filters.free) {
      filtered = filtered.filter(program => program.free);
    }

    // Filter by indoor
    if (filters.indoor) {
      filtered = filtered.filter(program => program.indoor);
    }

    // Filter by outdoor
    if (filters.outdoor) {
      filtered = filtered.filter(program => program.outdoor);
    }

    setFilteredPrograms(filtered);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
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
        programs={programs}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-textSecondaryLight">
          {filteredPrograms.length} program{filteredPrograms.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Program List */}
      <AnimatePresence mode="wait">
        {filteredPrograms.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="cosmic-card p-8 text-center"
          >
            <p className="text-textSecondaryLight">
              No programs match your current filters.
            </p>
            <button
              onClick={() => setFilters({ tags: [], free: false, indoor: false, outdoor: false })}
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
            {filteredPrograms.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
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
