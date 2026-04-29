import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface TabProps {
  to: string;
  icon: React.ReactNode;
  label?: string;
  translationKey?: string;
  showDot?: boolean;
}

export default function Tab({ to, icon, label, translationKey, showDot = false }: TabProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const isActive = location.pathname === to || 
    (to === '/explore' && location.pathname.startsWith('/explore'));
  
  const displayLabel = translationKey ? t(translationKey) : label;

  return (
    <Link
      to={to}
      className="relative flex flex-col items-center justify-center py-3 px-4 transition-colors duration-200 min-h-[56px] min-w-[48px]"
      aria-label={displayLabel}
      aria-current={isActive ? 'page' : undefined}
      role="menuitem"
    >
      <div className="relative">
        {/* Icon */}
        <motion.div
          className={`w-6 h-6 transition-colors duration-200 ${
            isActive ? 'text-teal' : 'text-textSecondaryLight'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {icon}
        </motion.div>
        
        {/* Notification dot (Fix for R-03: Inadequate Offline Feedback) */}
        {showDot && (
          <motion.div
            className="offline-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        )}
      </div>
      
      {/* Label */}
      <span
        className={`text-xs font-medium mt-1 transition-colors duration-200 ${
          isActive ? 'text-teal' : 'text-textSecondaryLight'
        }`}
      >
        {displayLabel}
      </span>
      
      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-1/2 w-1 h-1 bg-teal rounded-full"
          layoutId="activeTab"
          initial={false}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ x: '-50%' }}
        />
      )}
    </Link>
  );
}
