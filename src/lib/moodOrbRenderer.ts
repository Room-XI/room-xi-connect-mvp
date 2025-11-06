/**
 * 7-Day Mood Orb Renderer
 * Implements offscreen canvas rendering with gradient blending
 * As per mood_orb_system_spec.md and performance_low_power_mode.md
 */

interface MoodColor {
  h: number;
  s: number;
  l: number;
}

interface OrbData {
  distribution: Record<string, number> | null;
  dominantMood: string;
  dominantColor: MoodColor;
  opacity: Record<string, number> | null;
  ambientIntensity: number;
  streakDays: number;
  suppressed?: boolean;
}

interface RenderOptions {
  width: number;
  height: number;
  lowPowerMode?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
  showPatterns?: boolean;
}

// Mood color definitions
const MOOD_COLORS: Record<string, MoodColor> = {
  Cold: { h: 210, s: 60, l: 45 },
  Stormy: { h: 270, s: 55, l: 40 },
  Foggy: { h: 200, s: 20, l: 60 },
  Clear: { h: 60, s: 50, l: 60 },
  Breezy: { h: 120, s: 45, l: 55 },
  Aurora: { h: 330, s: 65, l: 55 }
};

export class MoodOrbRenderer {
  private canvas: OffscreenCanvas | HTMLCanvasElement;
  private ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  private animationFrame: number | null = null;
  private settleProgress: number = 1;
  private settleStartTime: number | null = null;
  private gradientCache: Map<string, CanvasGradient> = new Map();
  private textureCache: Map<string, ImageBitmap> = new Map();
  
  // Performance metrics
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fps: number = 30;
  
  constructor(options: RenderOptions) {
    // Use OffscreenCanvas if available for better performance
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(options.width, options.height);
      this.ctx = this.canvas.getContext('2d', {
        alpha: true,
        desynchronized: true
      }) as OffscreenCanvasRenderingContext2D;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = options.width;
      this.canvas.height = options.height;
      this.ctx = this.canvas.getContext('2d', {
        alpha: true,
        desynchronized: true
      }) as CanvasRenderingContext2D;
    }
    
    this.prebakeTextures();
  }
  
  /**
   * Pre-bake gradient textures for performance
   */
  private async prebakeTextures() {
    for (const [moodName, color] of Object.entries(MOOD_COLORS)) {
      const gradient = this.createRadialGradient(color, 0.5);
      this.gradientCache.set(moodName, gradient);
    }
  }
  
  /**
   * Create a radial gradient for a mood color
   */
  private createRadialGradient(color: MoodColor, opacity: number): CanvasGradient {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    
    // Inner glow
    gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l + 10}%, ${opacity})`);
    // Main color
    gradient.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${opacity})`);
    // Outer fade
    gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.l - 10}%, ${opacity * 0.3})`);
    
    return gradient;
  }
  
  /**
   * Render the 7-day mood orb
   */
  public render(orbData: OrbData, options: RenderOptions): ImageBitmap | HTMLCanvasElement {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (orbData.suppressed) {
      this.renderSuppressed(options);
      return this.canvas as HTMLCanvasElement;
    }
    
    // Low power mode - static render only
    if (options.lowPowerMode) {
      this.renderStatic(orbData, options);
      return this.canvas as HTMLCanvasElement;
    }
    
    // Render animated orb
    this.renderAnimated(orbData, options);
    return this.canvas as HTMLCanvasElement;
  }
  
  /**
   * Render static orb (low power mode)
   */
  private renderStatic(orbData: OrbData, options: RenderOptions) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    // Draw ambient background at 25% intensity
    this.drawAmbientBackground(orbData.dominantColor, orbData.ambientIntensity);
    
    // Set composite operation for screen blending
    this.ctx.globalCompositeOperation = 'screen';
    
    // Draw each mood layer
    if (orbData.distribution && orbData.opacity) {
      for (const [mood, ratio] of Object.entries(orbData.distribution)) {
        if (ratio > 0) {
          const opacity = orbData.opacity[mood];
          const gradient = this.gradientCache.get(mood) || 
                          this.createRadialGradient(MOOD_COLORS[mood], opacity);
          
          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, radius * (0.8 + ratio * 0.2), 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
    
    // Reset composite operation
    this.ctx.globalCompositeOperation = 'source-over';
    
    // Draw streak halo if present
    if (orbData.streakDays > 0) {
      this.drawStreakHalo(orbData.streakDays, centerX, centerY, radius);
    }
    
    // Accessibility overlays
    if (options.highContrast) {
      this.drawHighContrastRing(centerX, centerY, radius);
    }
    
    if (options.showPatterns) {
      this.drawPatternOverlays(orbData, centerX, centerY, radius);
    }
  }
  
  /**
   * Render animated orb with breathing effect
   */
  private renderAnimated(orbData: OrbData, options: RenderOptions) {
    const animate = () => {
      // Track FPS
      this.trackFPS();
      
      // Clear and redraw
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const baseRadius = Math.min(centerX, centerY) * 0.8;
      
      // Calculate breathing animation (8 second cycle)
      const breathingCycle = Date.now() / 8000;
      const breathingScale = 1 + Math.sin(breathingCycle * Math.PI * 2) * 0.05;
      const radius = baseRadius * breathingScale;
      
      // Calculate settle animation (10-12 minutes after check-in)
      let settleScale = 1;
      if (this.settleStartTime) {
        const settleElapsed = Date.now() - this.settleStartTime;
        const settleDuration = options.reducedMotion ? 120000 : 660000; // 2 min or 11 min
        
        if (settleElapsed < settleDuration) {
          this.settleProgress = settleElapsed / settleDuration;
          settleScale = 0.5 + this.settleProgress * 0.5;
        } else {
          this.settleStartTime = null;
          this.settleProgress = 1;
        }
      }
      
      // Draw layers with animation
      this.drawAmbientBackground(orbData.dominantColor, orbData.ambientIntensity * settleScale);
      
      this.ctx.globalCompositeOperation = 'screen';
      
      if (orbData.distribution && orbData.opacity) {
        for (const [mood, ratio] of Object.entries(orbData.distribution)) {
          if (ratio > 0) {
            const opacity = orbData.opacity[mood] * settleScale;
            const moodRadius = radius * (0.8 + ratio * 0.2) * settleScale;
            
            const gradient = this.ctx.createRadialGradient(
              centerX, centerY, 0,
              centerX, centerY, moodRadius
            );
            
            const color = MOOD_COLORS[mood];
            gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l + 10}%, ${opacity})`);
            gradient.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${opacity})`);
            gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.l - 10}%, ${opacity * 0.3})`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, moodRadius, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }
      
      this.ctx.globalCompositeOperation = 'source-over';
      
      // Draw streak halo
      if (orbData.streakDays > 0) {
        this.drawStreakHalo(orbData.streakDays, centerX, centerY, radius);
      }
      
      // Continue animation if not in reduced motion
      if (!options.reducedMotion) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Draw ambient background
   */
  private drawAmbientBackground(color: MoodColor, intensity: number) {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
    );
    
    gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${intensity})`);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Draw streak halo (0-7 days)
   */
  private drawStreakHalo(days: number, x: number, y: number, radius: number) {
    const haloRadius = radius * 1.1;
    const intensity = days / 7;
    
    this.ctx.strokeStyle = `hsla(45, 80%, 60%, ${intensity * 0.6})`;
    this.ctx.lineWidth = 3 + days;
    this.ctx.beginPath();
    this.ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Add sparkles for 7-day streak
    if (days === 7) {
      this.drawSparkles(x, y, haloRadius);
    }
  }
  
  /**
   * Draw sparkle effects for perfect streak
   */
  private drawSparkles(x: number, y: number, radius: number) {
    const sparkleCount = 8;
    
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / sparkleCount) * Math.PI * 2;
      const sparkleX = x + Math.cos(angle) * radius * 1.2;
      const sparkleY = y + Math.sin(angle) * radius * 1.2;
      
      const gradient = this.ctx.createRadialGradient(
        sparkleX, sparkleY, 0,
        sparkleX, sparkleY, 10
      );
      
      gradient.addColorStop(0, 'hsla(45, 100%, 70%, 0.8)');
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(sparkleX, sparkleY, 10, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  /**
   * Draw high contrast accessibility ring
   */
  private drawHighContrastRing(x: number, y: number, radius: number) {
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  
  /**
   * Draw pattern overlays for accessibility
   * Dots for warm moods, lines for cool moods
   */
  private drawPatternOverlays(orbData: OrbData, x: number, y: number, radius: number) {
    if (!orbData.distribution) return;
    
    const warmMoods = ['Clear', 'Breezy', 'Aurora'];
    const coolMoods = ['Cold', 'Stormy', 'Foggy'];
    
    // Calculate dominant temperature
    let warmTotal = 0;
    let coolTotal = 0;
    
    for (const [mood, ratio] of Object.entries(orbData.distribution)) {
      if (warmMoods.includes(mood)) warmTotal += ratio;
      if (coolMoods.includes(mood)) coolTotal += ratio;
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    
    if (warmTotal > coolTotal) {
      // Draw dots for warm
      this.drawDotPattern(x, y, radius);
    } else {
      // Draw lines for cool
      this.drawLinePattern(x, y, radius);
    }
    
    this.ctx.restore();
  }
  
  /**
   * Draw dot pattern
   */
  private drawDotPattern(x: number, y: number, radius: number) {
    const dotSize = 4;
    const spacing = 15;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    
    for (let dx = -radius; dx <= radius; dx += spacing) {
      for (let dy = -radius; dy <= radius; dy += spacing) {
        if (Math.sqrt(dx * dx + dy * dy) <= radius) {
          this.ctx.beginPath();
          this.ctx.arc(x + dx, y + dy, dotSize, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }
  
  /**
   * Draw line pattern
   */
  private drawLinePattern(x: number, y: number, radius: number) {
    const spacing = 10;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    
    // Create clipping mask
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.clip();
    
    // Draw diagonal lines
    for (let offset = -radius * 2; offset <= radius * 2; offset += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x - radius + offset, y - radius);
      this.ctx.lineTo(x + radius + offset, y + radius);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
  
  /**
   * Render suppressed state (insufficient data)
   */
  private renderSuppressed(_options: RenderOptions) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    // Draw placeholder orb
    this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 5]);
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Add text
    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
    this.ctx.font = '14px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Insufficient data', centerX, centerY);
    this.ctx.font = '12px system-ui';
    this.ctx.fillText('Check in daily to see your mood orb', centerX, centerY + 20);
  }
  
  /**
   * Track FPS for performance monitoring
   */
  private trackFPS() {
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      this.fps = 1000 / delta;
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    // Log performance warning if FPS drops below 30
    if (this.frameCount % 60 === 0 && this.fps < 30) {
      console.warn(`[MoodOrbRenderer] Low FPS detected: ${this.fps.toFixed(1)}`);
    }
  }
  
  /**
   * Start settle animation after check-in
   */
  public startSettle() {
    this.settleStartTime = Date.now();
    this.settleProgress = 0;
  }
  
  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics() {
    const memoryUsage = (performance as any).memory ? 
      (performance as any).memory.usedJSHeapSize / 1048576 : 0;
    
    return {
      fps: this.fps,
      frameCount: this.frameCount,
      memoryMB: memoryUsage,
      cacheSize: this.gradientCache.size + this.textureCache.size
    };
  }
  
  /**
   * Cleanup and stop animation
   */
  public destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.gradientCache.clear();
    this.textureCache.clear();
  }
}

export default MoodOrbRenderer;