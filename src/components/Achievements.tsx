import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  Star, 
  Target,
  Zap,
  Heart,
  Calendar,
  TrendingUp,
  Award,
  Lock,
  CheckCircle
} from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'checkin' | 'journal' | 'program' | 'community' | 'special';
  points: number;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserStats {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  rank: string;
  unlockedCount: number;
  totalAchievements: number;
}

const ACHIEVEMENT_ICONS: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  target: Target,
  zap: Zap,
  heart: Heart,
  calendar: Calendar,
  trending: TrendingUp,
  award: Award
};

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-600'
};

const RARITY_GLOW = {
  common: 'shadow-gray-300',
  rare: 'shadow-blue-300',
  epic: 'shadow-purple-300',
  legendary: 'shadow-yellow-300'
};

export function Achievements() {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [newUnlock, setNewUnlock] = useState<Achievement | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      
      // Fetch achievements from API
      const response = await fetch('/api/achievements', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || getMockAchievements());
        setUserStats(data.stats || getMockStats());
        
        // Check for newly unlocked achievements
        const newlyUnlocked = data.achievements?.find(
          (a: Achievement) => a.unlockedAt && 
          new Date(a.unlockedAt).getTime() > Date.now() - 5000
        );
        if (newlyUnlocked) {
          setNewUnlock(newlyUnlocked);
          setTimeout(() => setNewUnlock(null), 5000);
        }
      } else {
        // Use mock data if API fails
        setAchievements(getMockAchievements());
        setUserStats(getMockStats());
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      setAchievements(getMockAchievements());
      setUserStats(getMockStats());
    } finally {
      setLoading(false);
    }
  };

  const getMockAchievements = (): Achievement[] => [
    {
      id: '1',
      name: 'First Steps',
      description: 'Complete your first mood check-in',
      icon: 'star',
      category: 'checkin',
      points: 10,
      unlockedAt: new Date().toISOString(),
      rarity: 'common'
    },
    {
      id: '2',
      name: 'Week Warrior',
      description: 'Maintain a 7-day check-in streak',
      icon: 'calendar',
      category: 'streak',
      points: 50,
      progress: 5,
      maxProgress: 7,
      rarity: 'rare'
    },
    {
      id: '3',
      name: 'Journal Master',
      description: 'Write 30 journal entries',
      icon: 'award',
      category: 'journal',
      points: 100,
      progress: 12,
      maxProgress: 30,
      rarity: 'epic'
    },
    {
      id: '4',
      name: 'Community Champion',
      description: 'Attend 10 community programs',
      icon: 'heart',
      category: 'program',
      points: 75,
      progress: 3,
      maxProgress: 10,
      rarity: 'rare'
    },
    {
      id: '5',
      name: 'Aurora Seeker',
      description: 'Reach Aurora mood 10 times',
      icon: 'trophy',
      category: 'special',
      points: 200,
      progress: 2,
      maxProgress: 10,
      rarity: 'legendary'
    },
    {
      id: '6',
      name: 'Consistency King',
      description: 'Check in for 30 consecutive days',
      icon: 'trending',
      category: 'streak',
      points: 150,
      rarity: 'epic'
    }
  ];

  const getMockStats = (): UserStats => ({
    totalPoints: 285,
    level: 4,
    nextLevelPoints: 500,
    rank: 'Rising Star',
    unlockedCount: 8,
    totalAchievements: 25
  });

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const categories = [
    { id: 'all', label: t('achievements.allCategories') },
    { id: 'streak', label: t('achievements.streaks') },
    { id: 'checkin', label: t('achievements.checkIns') },
    { id: 'journal', label: t('achievements.journal') },
    { id: 'program', label: t('achievements.programs') },
    { id: 'community', label: t('achievements.community') },
    { id: 'special', label: t('achievements.special') }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">{t('achievements.title')}</h1>
        </div>

        {/* User Stats */}
        {userStats && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-white/80 text-sm mb-1">{t('achievements.level')}</p>
                <p className="text-3xl font-bold">Level {userStats.level}</p>
                <div className="mt-2 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ width: `${(userStats.totalPoints % 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <p className="text-white/80 text-sm mb-1">{t('achievements.totalPoints')}</p>
                <p className="text-3xl font-bold">{userStats.totalPoints}</p>
              </div>
              
              <div>
                <p className="text-white/80 text-sm mb-1">{t('achievements.rank')}</p>
                <p className="text-2xl font-semibold">{userStats.rank}</p>
              </div>
              
              <div>
                <p className="text-white/80 text-sm mb-1">{t('achievements.unlocked')}</p>
                <p className="text-3xl font-bold">
                  {userStats.unlockedCount}/{userStats.totalAchievements}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAchievements.map((achievement, index) => {
          const Icon = ACHIEVEMENT_ICONS[achievement.icon] || Trophy;
          const isUnlocked = !!achievement.unlockedAt;
          const progressPercentage = achievement.maxProgress 
            ? (achievement.progress || 0) / achievement.maxProgress * 100
            : 0;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedAchievement(achievement)}
              className={`relative bg-white dark:bg-gray-800 rounded-xl p-6 cursor-pointer transition-all ${
                isUnlocked 
                  ? `shadow-lg ${RARITY_GLOW[achievement.rarity]}` 
                  : 'opacity-75'
              }`}
            >
              {/* Rarity Badge */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${RARITY_COLORS[achievement.rarity]} text-white`}>
                {achievement.rarity.toUpperCase()}
              </div>

              {/* Icon */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isUnlocked
                  ? `bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]}`
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                {isUnlocked ? (
                  <Icon className="w-8 h-8 text-white" />
                ) : (
                  <Lock className="w-8 h-8 text-gray-500" />
                )}
              </div>

              {/* Content */}
              <h3 className="font-semibold text-lg mb-1">{achievement.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {achievement.description}
              </p>

              {/* Progress Bar */}
              {achievement.maxProgress && !isUnlocked && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{t('achievements.progress')}</span>
                    <span>{achievement.progress}/{achievement.maxProgress}</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full h-2 transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Points */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  +{achievement.points} {t('achievements.points')}
                </span>
                {isUnlocked && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* New Unlock Notification */}
      <AnimatePresence>
        {newUnlock && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-xl shadow-2xl z-50 max-w-sm"
          >
            <div className="flex items-center space-x-4">
              <Trophy className="w-12 h-12" />
              <div>
                <p className="font-bold text-lg">{t('achievements.unlocked')}!</p>
                <p className="text-white/90">{newUnlock.name}</p>
                <p className="text-sm text-white/80">+{newUnlock.points} points</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Achievement details */}
              <div className="text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br ${RARITY_COLORS[selectedAchievement.rarity]}`}>
                  {ACHIEVEMENT_ICONS[selectedAchievement.icon] && 
                    React.createElement(ACHIEVEMENT_ICONS[selectedAchievement.icon], {
                      className: "w-12 h-12 text-white"
                    })
                  }
                </div>
                <h2 className="text-2xl font-bold mb-2">{selectedAchievement.name}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {selectedAchievement.description}
                </p>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${RARITY_COLORS[selectedAchievement.rarity]} text-white mb-4`}>
                  {selectedAchievement.rarity.toUpperCase()} • {selectedAchievement.points} pts
                </div>
                {selectedAchievement.unlockedAt && (
                  <p className="text-sm text-gray-500">
                    {t('achievements.unlockedOn', {
                      date: new Date(selectedAchievement.unlockedAt).toLocaleDateString()
                    })}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}