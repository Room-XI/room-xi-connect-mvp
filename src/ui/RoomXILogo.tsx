import { motion, HTMLMotionProps } from 'framer-motion';

interface RoomXILogoProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  size?: number;
  variant?: 'deepSage' | 'teal' | 'gold' | 'original';
  className?: string;
}

const colorFilters = {
  deepSage: 'brightness(0) saturate(100%) invert(24%) sepia(15%) saturate(1000%) hue-rotate(100deg) brightness(95%) contrast(90%)',
  teal: 'brightness(0) saturate(100%) invert(60%) sepia(50%) saturate(500%) hue-rotate(115deg) brightness(95%) contrast(95%)',
  gold: 'none',
  original: 'none',
};

export default function RoomXILogo({ 
  size = 32, 
  variant = 'deepSage',
  className = '',
  ...motionProps 
}: RoomXILogoProps) {
  return (
    <motion.div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      {...motionProps}
    >
      <img
        src="/roomxi-logo.png"
        alt="Room XI logo"
        className="w-full h-full object-contain"
        style={{ 
          filter: colorFilters[variant],
        }}
      />
    </motion.div>
  );
}
