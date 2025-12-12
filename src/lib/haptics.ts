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
    
    await module.Haptics.impact({ style: module.ImpactStyle.Light }).catch(() => {});
  },

  medium: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.impact({ style: module.ImpactStyle.Medium }).catch(() => {});
  },

  heavy: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.impact({ style: module.ImpactStyle.Heavy }).catch(() => {});
  },

  success: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.notification({ type: module.NotificationType.Success }).catch(() => {});
  },

  warning: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.notification({ type: module.NotificationType.Warning }).catch(() => {});
  },

  error: async () => {
    if (isReducedMotion()) return;
    const module = await getHapticsModule();
    if (!module) return;
    
    await module.Haptics.notification({ type: module.NotificationType.Error }).catch(() => {});
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
    }
  }
};
