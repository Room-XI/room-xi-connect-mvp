import { isNativePlatform } from './capacitor';

let hapticsModule: typeof import('@capacitor/haptics') | null = null;

async function getHapticsModule() {
  if (!isNativePlatform()) return null;
  
  if (!hapticsModule) {
    hapticsModule = await import('@capacitor/haptics');
  }
  
  return hapticsModule;
}

const isReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const haptics = {
  light: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.impact({ style: module.ImpactStyle.Light }).catch(err => {
      console.warn('Haptic feedback failed:', err);
    });
  },

  medium: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.impact({ style: module.ImpactStyle.Medium }).catch(err => {
      console.warn('Haptic feedback failed:', err);
    });
  },

  heavy: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.impact({ style: module.ImpactStyle.Heavy }).catch(err => {
      console.warn('Haptic feedback failed:', err);
    });
  },

  success: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.notification({ type: module.NotificationType.Success }).catch(err => {
      console.warn('Haptic feedback failed:', err);
    });
  },

  warning: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.notification({ type: module.NotificationType.Warning }).catch(err => {
      console.warn('Haptic feedback failed:', err);
    });
  },

  error: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.notification({ type: module.NotificationType.Error }).catch(err => {
      console.warn('Haptic feedback failed:', err);
    });
  },

  selection: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    try {
      await module.Haptics.selectionStart();
      await module.Haptics.selectionChanged();
      await module.Haptics.selectionEnd();
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  }
};
