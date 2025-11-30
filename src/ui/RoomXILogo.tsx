import { motion, HTMLMotionProps } from 'framer-motion';

interface RoomXILogoProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  size?: number;
  className?: string;
}

export default function RoomXILogo({ 
  size = 32, 
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
          mixBlendMode: 'multiply',
          filter: 'sepia(100%) saturate(300%) brightness(65%) hue-rotate(95deg)',
        }}
      />
    </motion.div>
  );
}
