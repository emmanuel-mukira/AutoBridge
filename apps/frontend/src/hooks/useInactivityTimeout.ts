import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/app/store';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click',
] as const;

export function useInactivityTimeout(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.actions.logout);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutRef = useRef(logout);

  // Keep logoutRef current without re-registering listeners
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const resetTimer = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      console.log('[useInactivityTimeout] User inactive for 15 minutes, logging out...');
      logoutRef.current();
    }, INACTIVITY_TIMEOUT);
  }, []); // stable — no deps change this

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, resetTimer]);
}
