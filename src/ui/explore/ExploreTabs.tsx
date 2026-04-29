import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/lib/session';

interface ExploreTabsProps {
  current: 'today' | 'programs' | 'thisWeek' | 'map' | 'saved';
}

export default function ExploreTabs({ current }: ExploreTabsProps) {
  const { t } = useTranslation();
  const { user } = useSession();
  
  const tabs = [
    { key: 'today', to: '/explore/today', label: t('explore.tabs.today') },
    { key: 'thisWeek', to: '/explore/this-week', label: t('explore.tabs.thisWeek', { defaultValue: 'This Week' }) },
    { key: 'programs', to: '/explore', label: t('explore.tabs.programs') },
    { key: 'map', to: '/explore/map', label: t('explore.tabs.map') },
    ...(user ? [{ key: 'saved', to: '/explore/saved', label: t('explore.tabs.saved') }] : [])
  ];

  return (
    <div 
      role="tablist" 
      aria-label={t('explore.tabs.ariaLabel')} 
      className={`segmented-control ${user ? 'grid-cols-5' : 'grid-cols-4'}`}
    >
      {tabs.map(tab => (
        <Link
          key={tab.key}
          to={tab.to}
          role="tab"
          aria-selected={current === tab.key}
          className={`relative w-full text-center py-3 rounded-lg text-sm font-semibold transition-colors duration-200 block ${
            current === tab.key
              ? 'text-deepSage'
              : 'text-textSecondaryLight hover:text-deepSage'
          }`}
        >
          <motion.span
            className="block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {tab.label}
          </motion.span>
          
          {current === tab.key && (
            <motion.div
              className="absolute inset-1 bg-surface shadow-sm rounded-lg -z-10"
              layoutId="activeExploreTab"
              initial={false}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </Link>
      ))}
    </div>
  );
}
