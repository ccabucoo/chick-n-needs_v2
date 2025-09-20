import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Custom hook to prevent rapid navigation
export const useNavigationThrottle = (cooldown = 200) => {
  const navigate = useNavigate();
  const lastNavigation = useRef(0);
  const isNavigating = useRef(false);

  const throttledNavigate = useCallback((to, options = {}) => {
    const now = Date.now();
    
    // Prevent rapid navigation
    if (now - lastNavigation.current < cooldown) {
      if (import.meta.env?.DEV) {
        console.log('Navigation throttled - too fast');
      }
      return;
    }
    
    // Prevent multiple simultaneous navigations
    if (isNavigating.current) {
      console.log('Navigation already in progress');
      return;
    }
    
    isNavigating.current = true;
    lastNavigation.current = now;
    
    // Navigate after a small delay to ensure UI updates
    setTimeout(() => {
      navigate(to, options);
      isNavigating.current = false;
    }, 50);
  }, [navigate, cooldown]);

  return throttledNavigate;
};

// Hook for navigation with loading state
export const useNavigationWithLoading = (cooldown = 200) => {
  const navigate = useNavigate();
  const lastNavigation = useRef(0);
  const isNavigating = useRef(false);

  const navigateWithLoading = useCallback((to, options = {}) => {
    const now = Date.now();
    
    // Prevent rapid navigation
    if (now - lastNavigation.current < cooldown) {
      return { success: false, reason: 'throttled' };
    }
    
    // Prevent multiple simultaneous navigations
    if (isNavigating.current) {
      return { success: false, reason: 'in_progress' };
    }
    
    isNavigating.current = true;
    lastNavigation.current = now;
    
    // Navigate after a small delay
    setTimeout(() => {
      navigate(to, options);
      isNavigating.current = false;
    }, 50);
    
    return { success: true };
  }, [navigate, cooldown]);

  return { navigateWithLoading, isNavigating: isNavigating.current };
};

export default useNavigationThrottle;
