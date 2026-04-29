import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Program {
  tags?: string[];
  programTags?: string[];
  free?: boolean;
  indoor?: boolean | null;
  outdoor?: boolean | null;
  ageMin?: number | null;
  ageMax?: number | null;
  costCents?: number;
}

export interface Filters {
  tags: string[];
  categories: string[];
  free: boolean;
  indoor?: boolean;
  outdoor?: boolean;
  timeOfDay?: string[];
  dropIn?: boolean;
  maxDistance?: number | null;
  ageRange?: string;
  cost?: 'all' | 'free' | 'paid';
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
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const PREDEFINED_CATEGORIES = [
    'education',
    'employment',
    'mentalHealth',
    'recreation',
    'arts',
    'social',
    'lifeSkills'
  ];

  const TIME_OF_DAY_OPTIONS = [
    { value: 'morning', label: t('explore.timeOfDay.morning') },
    { value: 'afternoon', label: t('explore.timeOfDay.afternoon') },
    { value: 'evening', label: t('explore.timeOfDay.evening') }
  ];

  const AGE_RANGE_OPTIONS = [
    { value: 'all', label: t('explore.ageRange.all') },
    { value: '12-14', label: t('explore.ageRange.12-14') },
    { value: '15-17', label: t('explore.ageRange.15-17') },
    { value: '18-24', label: t('explore.ageRange.18-24') },
    { value: '25+', label: t('explore.ageRange.25+') }
  ];

  const COST_OPTIONS = [
    { value: 'all', label: t('explore.cost.all') },
    { value: 'free', label: t('explore.cost.freeOnly') },
    { value: 'paid', label: t('explore.cost.paid') }
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
    let count = filters.tags?.length || 0;
    count += filters.categories?.length || 0;
    if (filters.free) count++;
    if (filters.indoor) count++;
    if (filters.outdoor) count++;
    if (filters.timeOfDay && filters.timeOfDay.length > 0) count += filters.timeOfDay.length;
    if (filters.dropIn) count++;
    if (filters.maxDistance !== null && filters.maxDistance !== undefined && filters.maxDistance > 0) count++;
    if (filters.ageRange && filters.ageRange !== 'all') count++;
    if (filters.cost && filters.cost !== 'all') count++;
    return count;
  };

  const hasActiveFilters = countActiveFilters() > 0;

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    
    onFilterChange({ ...filters, tags: newTags });
  };

  const toggleCategory = (category: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    onFilterChange({ ...filters, categories: newCategories });
  };

  const toggleTimeOfDay = (time: string) => {
    const currentTimes = filters.timeOfDay || [];
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter(t => t !== time)
      : [...currentTimes, time];
    
    onFilterChange({ ...filters, timeOfDay: newTimes });
  };

  const toggleFilter = (key: keyof Omit<Filters, 'tags' | 'categories' | 'timeOfDay' | 'maxDistance' | 'ageRange' | 'cost'>) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const handleDistanceChange = (distance: number) => {
    onFilterChange({ ...filters, maxDistance: distance === 0 ? null : distance });
  };

  const handleAgeRangeChange = (ageRange: string) => {
    onFilterChange({ ...filters, ageRange });
  };

  const handleCostChange = (cost: 'all' | 'free' | 'paid') => {
    onFilterChange({ ...filters, cost });
  };

  const clearAllFilters = () => {
    onFilterChange({ 
      tags: [], 
      categories: [],
      free: false, 
      indoor: false, 
      outdoor: false,
      timeOfDay: [],
      dropIn: false,
      maxDistance: null,
      ageRange: 'all',
      cost: 'all'
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
        aria-label={`${t('common.filters')}. ${hasActiveFilters ? `${countActiveFilters()} active filters.` : 'No active filters.'} ${isExpanded ? 'Close' : 'Open'} filter panel.`}
      >
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4" aria-hidden="true" />
          <span className="font-medium">
            {t('common.filters')} {hasActiveFilters && `(${countActiveFilters()})`}
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
            {filters.categories && filters.categories.map(category => (
              <motion.button
                key={category}
                onClick={() => toggleCategory(category)}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove ${t(`explore.categories.${category}`)} filter`}
              >
                <span>{t(`explore.categories.${category}`)}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            ))}
            
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
                aria-label={`Remove ${t('programs.free')} filter`}
              >
                <span>{t('programs.free')}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}
            
            {filters.indoor && (
              <motion.button
                onClick={() => toggleFilter('indoor')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove ${t('programs.indoor')} filter`}
              >
                <span>{t('programs.indoor')}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}
            
            {filters.outdoor && (
              <motion.button
                onClick={() => toggleFilter('outdoor')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove ${t('programs.outdoor')} filter`}
              >
                <span>{t('programs.outdoor')}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}

            {filters.dropIn && (
              <motion.button
                onClick={() => toggleFilter('dropIn')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove ${t('explore.availability.dropIn')} filter`}
              >
                <span>{t('explore.availability.dropIn')}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}

            {filters.timeOfDay && filters.timeOfDay.map(time => {
              const option = TIME_OF_DAY_OPTIONS.find(o => o.value === time);
              return (
                <motion.button
                  key={time}
                  onClick={() => toggleTimeOfDay(time)}
                  className="cosmic-chip selected flex items-center space-x-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={`Remove ${option?.label || time} filter`}
                >
                  <span>{option?.label || time}</span>
                  <X className="w-3 h-3" aria-hidden="true" />
                </motion.button>
              );
            })}

            {filters.maxDistance !== null && filters.maxDistance !== undefined && filters.maxDistance > 0 && (
              <motion.button
                onClick={() => onFilterChange({ ...filters, maxDistance: null })}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={t('explore.filters.removeDistanceAriaLabel', { distance: filters.maxDistance })}
              >
                <span>{t('explore.filters.withinDistance', { distance: filters.maxDistance })}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}

            {filters.ageRange && filters.ageRange !== 'all' && (
              <motion.button
                onClick={() => handleAgeRangeChange('all')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove ${t(`explore.ageRange.${filters.ageRange}`)} age range filter`}
              >
                <span>{t(`explore.ageRange.${filters.ageRange}`)}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}

            {filters.cost && filters.cost !== 'all' && (
              <motion.button
                onClick={() => handleCostChange('all')}
                className="cosmic-chip selected flex items-center space-x-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Remove ${filters.cost === 'free' ? t('explore.cost.freeOnly') : t('explore.cost.paid')} cost filter`}
              >
                <span>{filters.cost === 'free' ? t('explore.cost.freeOnly') : t('explore.cost.paid')}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </motion.button>
            )}
            
            <motion.button
              onClick={clearAllFilters}
              className="text-xs text-textSecondaryLight hover:text-coral transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('common.clearAll')}
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
              <h4 className="text-sm font-medium text-deepSage">{t('explore.filterLabels.quickFilters')}</h4>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  onClick={() => toggleFilter('free')}
                  className={`cosmic-chip ${filters.free ? 'selected' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={filters.free}
                >
                  {t('programs.free')}
                </motion.button>
                
                {filters.indoor !== undefined && (
                  <motion.button
                    onClick={() => toggleFilter('indoor')}
                    className={`cosmic-chip ${filters.indoor ? 'selected' : ''}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={filters.indoor}
                  >
                    {t('programs.indoor')}
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
                    {t('programs.outdoor')}
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
                    {t('explore.availability.dropIn')}
                  </motion.button>
                )}
              </div>
            </div>

            {/* Categories Filter */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-deepSage">{t('explore.filterLabels.categories')}</h4>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_CATEGORIES.map(category => {
                  const isSelected = filters.categories && filters.categories.includes(category);
                  return (
                    <motion.button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`cosmic-chip ${isSelected ? 'selected' : ''}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-pressed={isSelected || false}
                    >
                      {t(`explore.categories.${category}`)}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Age Range Filter */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-deepSage">{t('explore.filterLabels.ageRange')}</h4>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGE_OPTIONS.map(option => (
                  <motion.button
                    key={option.value}
                    onClick={() => handleAgeRangeChange(option.value)}
                    className={`cosmic-chip ${filters.ageRange === option.value || (!filters.ageRange && option.value === 'all') ? 'selected' : ''}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={filters.ageRange === option.value || (!filters.ageRange && option.value === 'all')}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Cost Filter */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-deepSage">{t('explore.filterLabels.cost')}</h4>
              <div className="flex flex-wrap gap-2">
                {COST_OPTIONS.map(option => (
                  <motion.button
                    key={option.value}
                    onClick={() => handleCostChange(option.value as 'all' | 'free' | 'paid')}
                    className={`cosmic-chip ${filters.cost === option.value || (!filters.cost && option.value === 'all') ? 'selected' : ''}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={filters.cost === option.value || (!filters.cost && option.value === 'all')}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Time of Day Filters */}
            {showTimeOfDay && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-deepSage">{t('explore.filterLabels.timeOfDay')}</h4>
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
                <h4 className="text-sm font-medium text-deepSage">{t('explore.filterLabels.distance')}</h4>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={filters.maxDistance || 0}
                    onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-sage/20 rounded-lg appearance-none cursor-pointer accent-teal"
                    aria-label={t('explore.filterLabels.distance')}
                    aria-valuemin={0}
                    aria-valuemax={50}
                    aria-valuenow={filters.maxDistance || 0}
                    aria-valuetext={filters.maxDistance && filters.maxDistance > 0 ? `Within ${filters.maxDistance} kilometers` : 'No distance limit'}
                  />
                  <div className="flex items-center justify-between text-sm text-textSecondaryLight">
                    <span>{t('explore.availability.anytime')}</span>
                    <span className="font-medium text-teal">
                      {filters.maxDistance && filters.maxDistance > 0 ? t('explore.filters.withinDistance', { distance: filters.maxDistance }) : t('explore.filters.noLimit')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {availableTags.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-deepSage">{t('explore.filterLabels.tags')}</h4>
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
                  className="text-sm text-coralText hover:text-coral/80 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('common.clearAll')}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
