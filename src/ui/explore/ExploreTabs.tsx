import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSession } from '@/lib/session';

interface ExploreTabsProps {
  current: 'programs' | 'map' | 'saved';
}

export default function ExploreTabs({ current }: ExploreTabsProps) {
  const { user } = useSession();
  
  const tabs = [
    { key: 'programs', to: '/explore', label: 'Programs' },
    { key: 'map', to: '/explore/map', label: 'Map' },
    ...(user ? [{ key: 'saved', to: '/explore/saved', label: 'Saved' }] : [])
  ];

  return (
    <div 
      role="tablist" 
      aria-label="Explore views" 
      className={`segmented-control ${user ? 'grid-cols-3' : 'grid-cols-2'}`}
    >
      {tabs.map(tab => (
        <Link
          key={tab.key}
          to={tab.to}
          role="tab"
          aria-selected={current === tab.key}
          className="relative"
        >
          <motion.button
            className={`w-full text-center py-3 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              current === tab.key
                ? 'text-deepSage'
                : 'text-textSecondaryLight hover:text-deepSage'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {tab.label}
          </motion.button>
          
          {/* Animated background for selected tab */}
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
