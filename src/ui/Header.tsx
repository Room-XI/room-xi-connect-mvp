import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Menu } from 'lucide-react';
import CrisisSheet from './crisis/CrisisSheet';

interface HeaderProps {
  title?: string;
  showCrisis?: boolean;
}

export default function Header({ title, showCrisis = true }: HeaderProps) {
  const [crisisOpen, setCrisisOpen] = useState(false);

  return (
    <>
      <header className="safe-area-top bg-surface border-b border-borderMutedLight/60 sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* App Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cosmic-gradient flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-teal" />
            </div>
            <h1 className="text-lg font-display font-semibold text-deepSage">
              {title || 'Room XI Connect'}
            </h1>
          </div>
          
          {/* Crisis Support Button - Always visible for safety */}
          {showCrisis && (
            <motion.button
              onClick={() => setCrisisOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-coral/10 text-coral hover:bg-coral/20 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Get crisis support"
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">Get help</span>
            </motion.button>
          )}
        </div>
      </header>
      
      {/* Crisis Support Sheet */}
      <CrisisSheet 
        open={crisisOpen} 
        onClose={() => setCrisisOpen(false)} 
      />
    </>
  );
}
