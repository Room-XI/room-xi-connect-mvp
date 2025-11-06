/**
 * MilestoneOrb Component
 * Special orb visualization for 28-day milestone celebration
 * Displays celebratory animation and achievement
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';

interface MilestoneOrbProps {
  streakCount: number;
  size?: number;
  className?: string;
  onComplete?: () => void;
}

export default function MilestoneOrb({ 
  streakCount, 
  size = 250, 
  className = '',
  onComplete 
}: MilestoneOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (streakCount !== 28 && streakCount % 28 !== 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Particle system for celebration effect
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      life: number;
      maxLife: number;

      constructor() {
        this.x = size / 2;
        this.y = size / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = Math.random() * 3 + 1;
        this.maxLife = Math.random() * 60 + 40;
        this.life = this.maxLife;
        
        const colors = [
          '#FFD700', // Gold
          '#FFA500', // Orange
          '#FF69B4', // Pink
          '#00CED1', // Turquoise
          '#7B68EE', // Purple
          '#98FB98', // Pale green
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // Gravity
        this.life--;
      }

      draw(ctx: CanvasRenderingContext2D) {
        const opacity = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
      }
    }

    const particles: Particle[] = [];
    let frame = 0;

    // Main orb properties
    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.3;

    function animate() {
      ctx.clearRect(0, 0, size, size);
      frame++;

      // Draw the main milestone orb with pulsing effect
      const pulseScale = 1 + Math.sin(frame * 0.05) * 0.1;
      const currentRadius = baseRadius * pulseScale;

      // Create golden gradient for milestone orb
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        currentRadius
      );
      
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(0.3, '#FFA500');
      gradient.addColorStop(0.6, '#FF8C00');
      gradient.addColorStop(1, '#FF6347');

      // Draw main orb
      ctx.save();
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#FFD700';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw inner shimmer
      ctx.save();
      ctx.globalAlpha = 0.6;
      const shimmerGradient = ctx.createRadialGradient(
        centerX - currentRadius * 0.3,
        centerY - currentRadius * 0.3,
        0,
        centerX,
        centerY,
        currentRadius
      );
      shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      shimmerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = shimmerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Add rotating rings
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(frame * 0.01);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 2;
      
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius + 15 + i * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Generate celebration particles
      if (frame % 3 === 0 && particles.length < 100) {
        particles.push(new Particle());
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.update();
        particle.draw(ctx);
        
        if (particle.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Draw "28" in the center
      ctx.save();
      ctx.font = `bold ${size * 0.15}px sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText('28', centerX, centerY);
      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    // Trigger completion callback after animation
    if (onComplete) {
      setTimeout(onComplete, 5000);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [streakCount, size, onComplete]);

  if (streakCount !== 28 && streakCount % 28 !== 0) {
    return null;
  }

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.8,
        type: 'spring',
        stiffness: 100
      }}
    >
      {/* Canvas for animated orb */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="drop-shadow-2xl"
      />

      {/* Achievement Banner */}
      <motion.div
        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 
                   bg-gradient-to-r from-amber-500 to-orange-500 
                   text-white px-4 py-2 rounded-full shadow-lg
                   flex items-center space-x-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <Trophy className="w-4 h-4" />
        <span className="text-sm font-bold">4 Week Milestone!</span>
        <Sparkles className="w-4 h-4" />
      </motion.div>

      {/* Floating stars animation */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 2,
            delay: i * 0.2,
            repeat: Infinity,
            repeatDelay: 3
          }}
        >
          <Star className="w-6 h-6 text-amber-400 fill-current" />
        </motion.div>
      ))}
    </motion.div>
  );
}