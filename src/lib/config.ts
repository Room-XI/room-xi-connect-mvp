const VITE_API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

export const API_BASE =
  VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location && window.location.origin
    ? `${window.location.origin}/api`
    : '/api');

export const isCapacitor = typeof window !== 'undefined' && 
  (window as any).Capacitor !== undefined;

export default { API_BASE, isCapacitor };
