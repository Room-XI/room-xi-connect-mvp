import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown } from 'lucide-react';

interface Program {
  tags?: string[];
  programTags?: string[];
  free?: boolean;
  indoor?: boolean | null;
  outdoor?: boolean | null;
}

export interface Filters {
  tags: string[];
  free: boolean;
  indoor?: boolean;
  outdoor?: boolean;
  timeOfDay?: string[];
  dropIn?: boolean;
  maxDistance?: number | null;
}

interface FilterBarProps {
  programs: Program[];
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  showTimeOfDay?: boolean;
  showDropIn?: boolean;
  showDistance?: boolean;
  hasLocation?: boolean;
}

export default function FilterBar({ 
  programs, 
  filters, 
  onFilterChange,
  showTimeOfDay = false,
  showDropIn = false,
  showDistance = false,
  hasLocation = false
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const TIME_OF_DAY_OPTIONS = [
    { value: 'morning', label: 'Morning (Before 12pm)' },
    { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
    { value: 'evening', label: 'Evening (5pm+)' }
  ];

  // Extract unique tags from all programs
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    programs.forEach(program => {
      const tags = program.tags || program.programTags || [];
      tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [programs]);

  const countActiveFilters = () => {
    let count = filters.tags.length;
    if (filters.free) count++;
    if (filters.indoor) count++;
    if (filters.outdoor) count++;
    if (filters.timeOfDay && filters.timeOfDay.length > 0) count += filters.timeOfDay.length;
    if (filters.dropIn) count++;
    if (filters.maxDistance !== null && filters.maxDistance !== undefined && filters.maxDistance > 0) count++;
    return count;
  };

  const hasActiveFilters = countActiveFilters() > 0;

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    
    onFilterChange({ ...filters, tags: newTags });
  };

  const toggleTimeOfDay = (time: string) => {
    const currentTimes = filters.timeOfDay || [];
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter(t => t !== time)
      : [...currentTimes, time];
    
    onFilterChange({ ...filters, timeOfDay: newTimes });
  };

  const toggleFilter = (key: keyof Omit<Filters, 'tags' | 'timeOfDay' | 'maxDistance'>) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const handleDistanceChange = (distance: number) => {
    onFilterChange({ ...filters, maxDistance: distance === 0 ? null : distance });
  };

  const clearAllFilters = () => {
    onFilterChange({ 
      tags: [], 
      free: false, 
      indoor: false, 
      outdoor: false,
      timeOfDay: [],
      dropIn: false,
      maxDistance: null
    });
  };

  return (
    <div className="space-y-3">
      {/* Filter Toggle Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
          hasActiveFilters 
            ? 'border-teal bg-teal/5 text-teal' 
            : 'border-borderMutedLight bg-surface text-textSecondaryLight hover:border-sage'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        aria-expanded={isExpanded}
        aria-controls="filter-panel"
        aria-label={`Filter programs. ${hasActiveFilters ? `${countActiveFilters()} active filters.` : 'No active filters.'} ${isExpanded ? 'Close' : 'Open'} filter panel.`}
      >
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4" aria-hidden="true" />
          <span className="font-medium">
            Filters {hasActiveFilters && `(${countActiveFilters()})`}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </motion.div>
      </motion.button>

      {/* Active Filters Summary */}
      <AnimatePresence>
        {hasActiveFilters && !isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {filters.tags.map(tag => (
              <motion.button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove ${tag} filter`}
              >
                <span>{tag}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            ))}
            
            {filters.free && (
              <motion.button
                onClick={() => toggleFilter('free')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Remove Free filter"
              >
                <span>Free</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}
            
            {filters.indoor && (
              <motion.button
                onClick={() => toggleFilter('indoor')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Remove Indoor filter"
              >
                <span>Indoor</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}
            
            {filters.outdoor && (
              <motion.button
                onClick={() => toggleFilter('outdoor')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Remove Outdoor filter"
              >
                <span>Outdoor</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}

            {filters.dropIn && (
              <motion.button
                onClick={() => toggleFilter('dropIn')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Remove Drop-in filter"
              >
                <span>Drop-in</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}

            {filters.timeOfDay && filters.timeOfDay.map(time => (
              <motion.button
                key={time}
                onClick={() => toggleTimeOfDay(time)}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove ${time} filter`}
              >
                <span className="capitalize">{time}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            ))}

            {filters.maxDistance !== null && filters.maxDistance !== undefined && filters.maxDistance > 0 && (
              <motion.button
                onClick={() => onFilterChange({ ...filters, maxDistance: null })}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove within ${filters.maxDistance}km distance filter`}
              >
                <span>Within {filters.maxDistance}km</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}
            
            <motion.button
              onClick={clearAllFilters}
              className="text-xs text-textSecondaryLight hover:text-coral transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear all
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="filter-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="cosmic-card p-4 space-y-4"
            role="region"
            aria-label="Filter options"
          >
            {/* Quick Filters */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-deepSage">Quick Filters</h4>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  onClick={() => toggleFilter('free')}
                  className={`cosmic-chip ${filters.free ? 'selected' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={filters.free}
                >
                  Free
                </motion.button>
                
                {filters.indoor !== undefined && (
                  <motion.button
                    onClick={() => toggleFilter('indoor')}
                    className={`cosmic-chip ${filters.indoor ? 'selected' : ''}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={filters.indoor}
                  >
                    Indoor
                  </motion.button>
                )}
                
                {filters.outdoor !== undefined && (
                  <motion.button
                    onClick={() => toggleFilter('outdoor')}
                    className={`cosmic-chip ${filters.outdoor ? 'selected' : ''}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={filters.outdoor}
                  >
                    Outdoor
                  </motion.button>
                )}

                {showDropIn && (
                  <motion.button
                    onClick={() => toggleFilter('dropIn')}
                    className={`cosmic-chip ${filters.dropIn ? 'selected' : ''}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={filters.dropIn}
                  >
                    Drop-in
                  </motion.button>
                )}
              </div>
            </div>

            {/* Time of Day Filters */}
            {showTimeOfDay && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-deepSage">Time of Day</h4>
                <div className="flex flex-wrap gap-2">
                  {TIME_OF_DAY_OPTIONS.map(option => (
                    <motion.button
                      key={option.value}
                      onClick={() => toggleTimeOfDay(option.value)}
                      className={`cosmic-chip ${filters.timeOfDay?.includes(option.value) ? 'selected' : ''}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-pressed={filters.timeOfDay?.includes(option.value)}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Distance Filter */}
            {showDistance && hasLocation && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-deepSage">Distance</h4>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={filters.maxDistance || 0}
                    onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-sage/20 rounded-lg appearance-none cursor-pointer accent-teal"
                    aria-label="Maximum distance in kilometers"
                    aria-valuemin={0}
                    aria-valuemax={50}
                    aria-valuenow={filters.maxDistance || 0}
                    aria-valuetext={filters.maxDistance && filters.maxDistance > 0 ? `Within ${filters.maxDistance} kilometers` : 'No distance limit'}
                  />
                  <div className="flex items-center justify-between text-sm text-textSecondaryLight">
                    <span>Any distance</span>
                    <span className="font-medium text-teal">
                      {filters.maxDistance && filters.maxDistance > 0 ? `Within ${filters.maxDistance}km` : 'No limit'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {availableTags.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-deepSage">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <motion.button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`cosmic-chip ${filters.tags.includes(tag) ? 'selected' : ''}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-pressed={filters.tags.includes(tag)}
                    >
                      {tag}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear All Button */}
            {hasActiveFilters && (
              <div className="pt-2 border-t border-borderMutedLight">
                <motion.button
                  onClick={clearAllFilters}
                  className="text-sm text-coral hover:text-coral/80 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear all filters
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
