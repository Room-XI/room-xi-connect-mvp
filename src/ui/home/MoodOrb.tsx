import { motion } from 'framer-motion';
import { getMoodByScore } from '@/lib/moodConfig';

interface MoodOrbProps {
  size?: number;
  mood?: number; // 1-6 mood level
  onClick?: () => void;
  className?: string;
}

// Helper function to convert HSL to gradient and glow
function getMoodStyle(score: number) {
  const mood = getMoodByScore(score);
  if (!mood) return null;
  
  const { h, s, l } = mood.color;
  
  // Create gradient with the base color
  const baseColor = `hsl(${h}, ${s}%, ${l}%)`;
  const darkerColor = `hsl(${h}, ${s}%, ${Math.max(l - 20, 10)}%)`;
  const darkestColor = `hsl(${h}, ${s}%, ${Math.max(l - 30, 5)}%)`;
  const lighterColor = `hsl(${h}, ${s}%, ${Math.min(l + 15, 95)}%)`;
  
  return {
    gradient: `radial-gradient(circle at 30% 30%, ${baseColor}, ${darkerColor}, ${darkestColor})`,
    glow: `hsl(${h}, ${s}%, ${l}%, 0.4)`,
    particles: lighterColor,
  };
}

// Mood-specific colors using the new 6-level system
// 1: Cold, 2: Stormy, 3: Foggy, 4: Clear, 5: Breezy, 6: Aurora
const moodStyles = {
  1: getMoodStyle(1), // Cold ❄️ - h:210, s:40, l:70
  2: getMoodStyle(2), // Stormy ⛈️ - h:250, s:70, l:40
  3: getMoodStyle(3), // Foggy 🌫️ - h:220, s:10, l:75
  4: getMoodStyle(4), // Clear ☀️ - h:48, s:95, l:55
  5: getMoodStyle(5), // Breezy ⚡ - h:52, s:98, l:58
  6: getMoodStyle(6), // Aurora 🌌 - h:285, s:70, l:60
};

// Default cosmic gradient when no mood is set
const defaultStyle = {
  gradient: 'radial-gradient(circle at 30% 30%, #2EC489, #6E8F7A, #D8AE3D)',
  glow: 'rgba(46, 196, 137, 0.4)',
  particles: '#2EC489',
};

export default function MoodOrb({ 
  size = 200, 
  mood, 
  onClick, 
  className = '' 
}: MoodOrbProps) {
  const style = (mood && moodStyles[mood as keyof typeof moodStyles]) || defaultStyle;
  
  return (
    <motion.div
      className={`relative cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Main orb with breathing animation */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: style.gradient,
          boxShadow: `0 0 30px ${style.glow}`,
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Highlight overlay for 3D effect */}
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle at 70% 30%, transparent 30%, rgba(255, 255, 255, 0.3) 70%)',
          }}
        />
        
        {/* Floating particles */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full opacity-60"
              style={{
                backgroundColor: style.particles,
                left: `${20 + (i * 12)}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
              animate={{
                y: [-10, 10, -10],
                x: [-5, 5, -5],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 6 + (i * 0.5),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
        
        {/* Ripple effect on hover */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 opacity-0"
          style={{ borderColor: style.particles }}
          whileHover={{
            scale: [1, 1.2, 1.4],
            opacity: [0, 0.6, 0],
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </motion.div>
      
      {/* Accessibility label */}
      <span className="sr-only">
        {mood ? `Current mood level: ${mood}` : 'Tap to check in your mood'}
      </span>
    </motion.div>
  );
}
