import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useSession } from '../lib/session';

const GATE_SKIP_TOKEN_KEY = 'explore_gate_skip_token';
const GATE_SKIP_DURATION_HOURS = 24;

interface ExploreGateState {
  isGateOpen: boolean;
  needsCheckIn: boolean;
  isLoading: boolean;
  currentTime: DateTime;
  gateTime: DateTime;
  hasSkipToken: boolean;
}

export function useExploreGate() {
  const { user, loading: sessionLoading, needsGuardianVerification } = useSession();
  const [state, setState] = useState<ExploreGateState>({
    isGateOpen: false,
    needsCheckIn: false,
    isLoading: true,
    currentTime: DateTime.now().setZone('America/Edmonton'),
    gateTime: DateTime.now().setZone('America/Edmonton').set({ hour: 8, minute: 0, second: 0, millisecond: 0 }),
    hasSkipToken: false
  });

  useEffect(() => {
    // Wait for session to load, then check gate status
    if (!sessionLoading) {
      checkGateStatus();
    }
  }, [sessionLoading, user, needsGuardianVerification]);

  async function checkGateStatus() {
    const zone = 'America/Edmonton';
    const now = DateTime.now().setZone(zone);
    const gate = now.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
    const driftEnd = gate.plus({ minutes: 2 });

    // Check for skip token
    const skipToken = localStorage.getItem(GATE_SKIP_TOKEN_KEY);
    let hasValidSkipToken = false;
    
    if (skipToken) {
      try {
        const skipData = JSON.parse(skipToken);
        const skipExpiry = DateTime.fromISO(skipData.expiry);
        hasValidSkipToken = skipExpiry > now;
      } catch {
        localStorage.removeItem(GATE_SKIP_TOKEN_KEY);
      }
    }

    // If skip token is valid, gate is always open
    if (hasValidSkipToken) {
      setState({
        isGateOpen: true,
        needsCheckIn: false,
        isLoading: false,
        currentTime: now,
        gateTime: gate,
        hasSkipToken: true
      });
      return;
    }

    // Check if current time is after gate (with drift window)
    const isAfterGate = now >= gate && now <= driftEnd ? true : now > driftEnd;

    if (!isAfterGate) {
      // Before 8am, gate is closed
      setState({
        isGateOpen: false,
        needsCheckIn: false,
        isLoading: false,
        currentTime: now,
        gateTime: gate,
        hasSkipToken: false
      });
      return;
    }

    // After 8am, check if user has done today's check-in
    // Only check if user is authenticated
    if (!user) {
      // For unauthenticated users, gate is always open (they'll need to log in for check-in features)
      setState({
        isGateOpen: true,
        needsCheckIn: false,
        isLoading: false,
        currentTime: now,
        gateTime: gate,
        hasSkipToken: false
      });
      return;
    }

    // For youth awaiting guardian verification, skip check-in requirement
    // They can't access check-in endpoints anyway, so allow them to browse programs/events
    if (needsGuardianVerification) {
      setState({
        isGateOpen: true,
        needsCheckIn: false,
        isLoading: false,
        currentTime: now,
        gateTime: gate,
        hasSkipToken: false
      });
      return;
    }
    
    try {
      const response = await api.checkins.getLast7Days();
      const todayDate = now.toISODate();
      
      // Check if there's a check-in for today
      const hasTodayCheckIn = response.data?.some(
        (checkin: any) => {
          const checkinDate = DateTime.fromISO(checkin.timestamp).setZone(zone).toISODate();
          return checkinDate === todayDate;
        }
      ) || false;

      setState({
        isGateOpen: hasTodayCheckIn,
        needsCheckIn: !hasTodayCheckIn,
        isLoading: false,
        currentTime: now,
        gateTime: gate,
        hasSkipToken: false
      });
    } catch (error) {
      console.error('[useExploreGate] Failed to check today\'s check-in:', error);
      // On error, allow access (fail open for better UX)
      setState({
        isGateOpen: true,
        needsCheckIn: false,
        isLoading: false,
        currentTime: now,
        gateTime: gate,
        hasSkipToken: false
      });
    }
  }

  function setSkipToken() {
    const expiry = DateTime.now().setZone('America/Edmonton').plus({ hours: GATE_SKIP_DURATION_HOURS });
    const skipData = {
      expiry: expiry.toISO(),
      created: DateTime.now().toISO()
    };
    localStorage.setItem(GATE_SKIP_TOKEN_KEY, JSON.stringify(skipData));
    setState(prev => ({ ...prev, hasSkipToken: true, isGateOpen: true }));
  }

  function clearSkipToken() {
    localStorage.removeItem(GATE_SKIP_TOKEN_KEY);
    setState(prev => ({ ...prev, hasSkipToken: false }));
    checkGateStatus();
  }

  return {
    ...state,
    checkGateStatus,
    setSkipToken,
    clearSkipToken
  };
}
