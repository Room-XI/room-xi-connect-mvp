import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CrisisSheet from './crisis/CrisisSheet';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface HeaderProps {
  title?: string;
  showCrisis?: boolean;
}

export default function Header({ title, showCrisis = true }: HeaderProps) {
  const navigate = useNavigate();
  const [crisisOpen, setCrisisOpen] = useState(false);

  return (
    <>
      <header className="safe-area-top bg-surface border-b border-borderMutedLight/60 sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* App Title */}
          <div className="flex items-center">
            <h1 className="text-lg font-display font-semibold text-deepSage">
              {title || 'Room XI Connect'}
            </h1>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Crisis Support Button - Always visible for safety */}
            {showCrisis && (
              <motion.button
                onClick={() => navigate('/safety-resources')}
                className="flex items-center space-x-2 px-4 py-3 rounded-lg bg-coral/10 text-[#9b2c2c] hover:bg-coral/20 transition-colors min-h-[44px] min-w-[44px]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Get crisis support"
              >
                <Heart className="w-4 h-4" />
                <span className="text-sm font-medium">Get help</span>
              </motion.button>
            )}
          </div>
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
