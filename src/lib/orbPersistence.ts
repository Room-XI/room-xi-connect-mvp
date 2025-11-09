/**
 * Orb Animation Persistence
 * Saves orb target state and tween start time to localStorage
 * Enables smooth animation resume across page reloads
 * 
 * Privacy: Only stores animation state (colors/timing), never raw mood data
 */

export interface OrbTweenState {
  orbTarget: {
    gradient: string;
    glow: string;
    particles: string;
  };
  tweenStartAt: number; // Timestamp when animation started
  settleMs: number; // Animation duration in milliseconds
}

const ORB_STATE_KEY = 'roomxi_orb_tween_state';

/**
 * Save orb tween state to localStorage
 */
export function saveOrbTweenState(state: OrbTweenState): void {
  try {
    localStorage.setItem(ORB_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save orb tween state:', error);
  }
}

/**
 * Load orb tween state from localStorage
 */
export function loadOrbTweenState(): OrbTweenState | null {
  try {
    const saved = localStorage.getItem(ORB_STATE_KEY);
    if (!saved) return null;
    
    const state = JSON.parse(saved) as OrbTweenState;
    
    // Validate structure
    if (!state.orbTarget || !state.tweenStartAt || !state.settleMs) {
      return null;
    }
    
    return state;
  } catch (error) {
    console.warn('Failed to load orb tween state:', error);
    return null;
  }
}

/**
 * Calculate tween progress (0-1) based on elapsed time
 */
export function calculateTweenProgress(tweenStartAt: number, settleMs: number): number {
  const now = Date.now();
  const elapsed = now - tweenStartAt;
  const progress = Math.min(elapsed / settleMs, 1);
  return progress;
}

/**
 * Clear orb tween state from localStorage
 */
export function clearOrbTweenState(): void {
  try {
    localStorage.removeItem(ORB_STATE_KEY);
  } catch (error) {
    console.warn('Failed to clear orb tween state:', error);
  }
}

/**
 * Check if saved tween state is still valid (not expired)
 * Tween states older than 24 hours are considered stale
 */
export function isTweenStateValid(state: OrbTweenState): boolean {
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  const age = Date.now() - state.tweenStartAt;
  return age < MAX_AGE_MS;
}
