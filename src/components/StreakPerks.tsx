/**
 * StreakPerks Component
 * Shows unlocked perks for users with 7+ day streaks
 * Including special Explore perk tile
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Map, 
  Sparkles, 
  Award,
  TrendingUp,
  Star,
  Gift,
  Unlock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StreakPerksProps {
  streakCount: number;
  className?: string;
}

interface Perk {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  unlockDay: number;
  action?: () => void;
  badge?: string;
}

export default function StreakPerks({ streakCount, className = '' }: StreakPerksProps) {
  const navigate = useNavigate();

  const perks: Perk[] = [
    {
      id: 'explore',
      title: 'Explore Unlocked',
      description: 'Discover programs and activities in your area',
      icon: Map,
      unlockDay: 7,
      action: () => navigate('/explore'),
      badge: 'NEW'
    },
    {
      id: 'achievement',
      title: 'Achievement Badge',
      description: 'You earned the Week Warrior badge!',
      icon: Award,
      unlockDay: 7,
    },
    {
      id: 'bonus_insights',
      title: 'Bonus Insights',
      description: 'Unlock deeper mood patterns analysis',
      icon: TrendingUp,
      unlockDay: 14,
    },
    {
      id: 'special_themes',
      title: 'Special Themes',
      description: 'Access exclusive orb themes',
      icon: Sparkles,
      unlockDay: 21,
    },
    {
      id: 'milestone_celebration',
      title: 'Milestone Celebration',
      description: 'Special 4-week consistency reward',
      icon: Trophy,
      unlockDay: 28,
    }
  ];

  const unlockedPerks = perks.filter(perk => streakCount >= perk.unlockDay);
  const nextPerk = perks.find(perk => streakCount < perk.unlockDay);

  if (streakCount < 7) {
    return null;
  }

  return (
    <motion.div
      className={`cosmic-card p-6 space-y-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-deepSage">Streak Perks</h3>
            <p className="text-xs text-textSecondaryLight">
              {streakCount} day streak • {unlockedPerks.length} perks unlocked
            </p>
          </div>
        </div>
      </div>

      {/* Unlocked Perks Grid */}
      <div className="grid gap-3">
        <AnimatePresence>
          {unlockedPerks.map((perk, index) => {
            const Icon = perk.icon;
            return (
              <motion.div
                key={perk.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative p-3 rounded-lg border transition-all
                  ${perk.action 
                    ? 'cursor-pointer hover:shadow-md hover:border-sage/50 border-sage/20' 
                    : 'border-gray-200'}
                  ${perk.id === 'explore' ? 'bg-gradient-to-r from-teal/5 to-sage/5' : 'bg-white'}
                `}
                onClick={perk.action}
              >
                <div className="flex items-start space-x-3">
                  <div className={`
                    p-2 rounded-lg flex-shrink-0
                    ${perk.id === 'explore' 
                      ? 'bg-gradient-to-br from-teal to-sage' 
                      : 'bg-sage/10'}
                  `}>
                    <Icon className={`
                      w-4 h-4
                      ${perk.id === 'explore' ? 'text-white' : 'text-sage'}
                    `} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-sm text-deepSage">
                        {perk.title}
                      </h4>
                      {perk.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-coral text-white rounded">
                          {perk.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-textSecondaryLight mt-0.5">
                      {perk.description}
                    </p>
                    {perk.action && (
                      <p className="text-xs text-sage mt-1 font-medium">
                        Tap to explore →
                      </p>
                    )}
                  </div>

                  {/* Unlock indicator */}
                  <div className="flex items-center space-x-1 text-xs text-sage">
                    <Unlock className="w-3 h-3" />
                    <span>Day {perk.unlockDay}</span>
                  </div>
                </div>

                {/* Shimmer effect for new unlocks */}
                {streakCount === perk.unlockDay && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                                  animate-shimmer rounded-lg" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Next Perk Preview */}
      {nextPerk && (
        <motion.div
          className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-textSecondaryLight">
              Next perk unlocks in <span className="font-semibold text-deepSage">
                {nextPerk.unlockDay - streakCount} days
              </span>: {nextPerk.title}
            </p>
          </div>
          
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
              initial={{ width: 0 }}
              animate={{ 
                width: `${((streakCount % 7) / 7) * 100}%` 
              }}
              transition={{ duration: 0.6, delay: 0.5 }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}