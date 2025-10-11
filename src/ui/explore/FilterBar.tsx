import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown } from 'lucide-react';

interface Program {
  tags: string[];
  free: boolean;
  indoor: boolean | null;
  outdoor: boolean | null;
}

interface Filters {
  tags: string[];
  free: boolean;
  indoor: boolean;
  outdoor: boolean;
}

interface FilterBarProps {
  programs: Program[];
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export default function FilterBar({ programs, filters, onFilterChange }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract unique tags from all programs
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    programs.forEach(program => {
      program.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [programs]);

  const hasActiveFilters = filters.tags.length > 0 || filters.free || filters.indoor || filters.outdoor;

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    
    onFilterChange({ ...filters, tags: newTags });
  };

  const toggleFilter = (key: keyof Omit<Filters, 'tags'>) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const clearAllFilters = () => {
    onFilterChange({ tags: [], free: false, indoor: false, outdoor: false });
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
      >
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span className="font-medium">
            Filters {hasActiveFilters && `(${filters.tags.length + (filters.free ? 1 : 0) + (filters.indoor ? 1 : 0) + (filters.outdoor ? 1 : 0)})`}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
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
              >
                <span>{tag}</span>
                <X className="w-3 h-3" />
              </motion.button>
            ))}
            
            {filters.free && (
              <motion.button
                onClick={() => toggleFilter('free')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Free</span>
                <X className="w-3 h-3" />
              </motion.button>
            )}
            
            {filters.indoor && (
              <motion.button
                onClick={() => toggleFilter('indoor')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Indoor</span>
                <X className="w-3 h-3" />
              </motion.button>
            )}
            
            {filters.outdoor && (
              <motion.button
                onClick={() => toggleFilter('outdoor')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Outdoor</span>
                <X className="w-3 h-3" />
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="cosmic-card p-4 space-y-4"
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
                >
                  Free
                </motion.button>
                
                <motion.button
                  onClick={() => toggleFilter('indoor')}
                  className={`cosmic-chip ${filters.indoor ? 'selected' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Indoor
                </motion.button>
                
                <motion.button
                  onClick={() => toggleFilter('outdoor')}
                  className={`cosmic-chip ${filters.outdoor ? 'selected' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Outdoor
                </motion.button>
              </div>
            </div>

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
