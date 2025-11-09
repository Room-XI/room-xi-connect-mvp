import { motion } from 'framer-motion';
import { useMoodGradient } from '@/hooks/useMoodGradient';
import { getMoodByKey, type MoodKey } from '@/lib/moodConfig';

interface AmbientMoodTintProps {
  intensity?: number;
}

export function AmbientMoodTint({ intensity = 0.2 }: AmbientMoodTintProps) {
  const { summary } = useMoodGradient();
  
  if (!summary || summary.daysWithData === 0) {
    return null;
  }
  
  const dominantMood = summary.dominant as MoodKey;
  if (!dominantMood) {
    return null;
  }
  
  const mood = getMoodByKey(dominantMood);
  const { h, s, l } = mood.color;
  
  const tintColor = `hsla(${h}, ${Math.max(s - 20, 20)}%, ${Math.max(l - 10, 10)}%, ${intensity})`;
  
  return (
    <>
      <motion.div
        className="fixed inset-0 pointer-events-none z-0 ambient-mood-tint"
        style={{
          background: `radial-gradient(ellipse at center top, ${tintColor}, transparent 70%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .ambient-mood-tint {
            transition: none !important;
            animation: none !important;
          }
        }
        @media (prefers-contrast: more) {
          .ambient-mood-tint {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
