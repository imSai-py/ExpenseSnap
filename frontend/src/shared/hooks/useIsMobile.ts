import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current device is mobile
 * Uses media query and touch detection
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const checkMobile = () => {
      // Check both screen width and touch capability
      const isSmallScreen = window.innerWidth < breakpoint;
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Consider mobile if small screen OR has touch capability on small-ish screens
      setIsMobile(isSmallScreen || (hasTouchScreen && window.innerWidth < 1024));
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * Trigger haptic feedback if available
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if ('vibrate' in navigator) {
    const duration = type === 'light' ? 10 : type === 'medium' ? 25 : 50;
    navigator.vibrate(duration);
  }
}
