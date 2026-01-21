/**
 * Push Notification Hook for ExpenseSnap
 *
 * Provides functionality for requesting browser notification permissions,
 * managing service worker registration, and handling push subscriptions.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { PushPermissionState, PushNotificationState } from '../types';

/**
 * Get the API base URL based on environment
 * - Production: Uses VITE_API_URL environment variable (Render backend)
 * - Development: Uses relative URL (Vite proxy handles it)
 */
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Convert a base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current notification permission state
 */
export function getNotificationPermission(): PushPermissionState {
  if (!isPushNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

/**
 * Safely parse JSON response, handling empty or invalid responses
 */
async function safeJsonParse(response: Response): Promise<{ success: boolean; error?: string;[key: string]: unknown }> {
  // Check if response is OK first
  if (!response.ok) {
    // Try to get error message from response
    try {
      const text = await response.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          return { success: false, error: json.error || `HTTP ${response.status}` };
        } catch {
          // Not JSON, use status text
        }
      }
    } catch {
      // Ignore read errors
    }
    return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
  }

  // Check content-type
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.warn('[Push] Response is not JSON:', contentType);
    // Try to read as text anyway in case it's JSON without proper content-type
    try {
      const text = await response.text();
      if (text && text.trim()) {
        return JSON.parse(text);
      }
    } catch {
      // Not valid JSON
    }
    return { success: false, error: 'Server returned non-JSON response' };
  }

  // Parse JSON safely
  try {
    const text = await response.text();
    if (!text || !text.trim()) {
      console.warn('[Push] Empty response body');
      return { success: false, error: 'Empty response from server' };
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('[Push] JSON parse error:', error);
    return { success: false, error: 'Invalid JSON response' };
  }
}

/**
 * Wait for service worker to be ready
 */


/**
 * Hook for managing push notifications
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    permission: getNotificationPermission(),
    isSubscribed: false,
    isLoading: true,
    error: null,
    serviceWorkerReady: false,
  });

  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const initializedRef = useRef(false);

  /**
   * Get or wait for service worker registration
   */
  const getServiceWorkerRegistration = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    // Return cached registration if available and active
    if (registrationRef.current?.active) {
      return registrationRef.current;
    }

    if (!isPushNotificationSupported()) {
      console.log('[Push] Push notifications not supported');
      return null;
    }

    try {
      // First check if already registered
      let registration = await navigator.serviceWorker.getRegistration('/');

      if (!registration) {
        // Try to register the service worker
        console.log('[Push] Registering service worker...');
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('[Push] Service worker registered');
      }

      // Wait for it to be active
      if (registration.installing || registration.waiting) {
        await new Promise<void>((resolve) => {
          const worker = registration!.installing || registration!.waiting;
          if (!worker) {
            resolve();
            return;
          }

          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
              resolve();
            }
          });

          // Also resolve if it's already active
          if (registration!.active) {
            resolve();
          }
        });
      }

      registrationRef.current = registration;
      setState(prev => ({ ...prev, serviceWorkerReady: true }));
      console.log('[Push] Service worker ready');
      return registration;
    } catch (error) {
      console.error('[Push] Service worker error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize service worker',
        serviceWorkerReady: false,
      }));
      return null;
    }
  }, []);

  /**
   * Fetch the VAPID public key from the server
   */
  const fetchVapidPublicKey = useCallback(async (): Promise<string | null> => {
    if (vapidPublicKey) {
      return vapidPublicKey;
    }

    try {
      console.log('[Push] Fetching VAPID public key...');
      const response = await fetch(`${API_BASE_URL}/push/vapid-public-key`, {
        credentials: 'include',
      });

      const data = await safeJsonParse(response);

      if (data.success && data.vapid_public_key) {
        const key = (data.vapid_public_key as string).trim(); // Trim any whitespace
        console.log('[Push] VAPID key received');
        setVapidPublicKey(key);
        return key;
      } else {
        console.warn('[Push] VAPID key not available:', data.error);
        return null;
      }
    } catch (error) {
      console.error('[Push] Failed to fetch VAPID key:', error);
      return null;
    }
  }, [vapidPublicKey]);

  /**
   * Check if user is currently subscribed
   */
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      const isSubscribed = subscription !== null;
      setState(prev => ({ ...prev, isSubscribed }));
      return isSubscribed;
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
      return false;
    }
  }, [getServiceWorkerRegistration]);

  /**
   * Request notification permission from the user
   */
  const requestPermission = useCallback(async (): Promise<PushPermissionState> => {
    if (!isPushNotificationSupported()) {
      return 'unsupported';
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      const permissionState = permission as PushPermissionState;
      setState(prev => ({
        ...prev,
        permission: permissionState,
        isLoading: false,
      }));
      return permissionState;
    } catch (error) {
      console.error('[Push] Error requesting permission:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to request notification permission',
        isLoading: false,
      }));
      return 'denied';
    }
  }, []);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Get service worker registration
      console.log('[Push] Step 1: Getting service worker...');
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Service worker not available. Please refresh the page.',
        }));
        return false;
      }

      // Step 2: Ensure we have permission
      console.log('[Push] Step 2: Checking permission...');
      if (Notification.permission !== 'granted') {
        const permission = await requestPermission();
        if (permission !== 'granted') {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: permission === 'denied'
              ? 'Notification permission denied. Please enable in browser settings.'
              : 'Notification permission not granted',
          }));
          return false;
        }
      }

      // Step 3: Get VAPID key
      console.log('[Push] Step 3: Getting VAPID key...');
      const key = await fetchVapidPublicKey();
      if (!key) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Push notifications not configured on server. Please try again.',
        }));
        return false;
      }
      console.log('[Push] VAPID key received:', key.substring(0, 20) + '...');

      // Step 4: Subscribe to push manager with detailed error handling
      console.log('[Push] Step 4: Subscribing to push manager...');
      let subscription;
      try {
        const applicationServerKey = urlBase64ToUint8Array(key);
        console.log('[Push] Application server key length:', applicationServerKey.length);

        // IMPORTANT: First check for and remove any existing subscription
        // This prevents "Registration failed - push service error" when VAPID keys change
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          console.log('[Push] Found existing subscription, unsubscribing first...');
          await existingSubscription.unsubscribe();
          console.log('[Push] Unsubscribed from old subscription');
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource,
        });
        console.log('[Push] Push manager subscription successful');
      } catch (pushError) {
        // Detailed error logging for push manager subscribe
        const errorMessage = pushError instanceof Error ? pushError.message : String(pushError);
        const errorName = pushError instanceof Error ? pushError.name : 'Unknown';

        console.error('[Push] Push manager subscribe failed:', {
          name: errorName,
          message: errorMessage,
          error: pushError
        });

        // Provide specific error messages based on error type
        let userMessage = 'Failed to register with push service.';
        if (errorMessage.includes('permission')) {
          userMessage = 'Notification permission denied. Please enable in browser settings.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else if (errorMessage.includes('abort')) {
          userMessage = 'Push registration was aborted. Please try again.';
        } else if (errorName === 'InvalidStateError') {
          userMessage = 'Push subscription already exists or is in invalid state. Try refreshing the page.';
        } else if (errorName === 'NotAllowedError') {
          userMessage = 'Push notifications not allowed. Please enable in browser settings.';
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `${userMessage} (${errorName}: ${errorMessage})`,
        }));
        return false;
      }

      // Step 5: Send subscription to server
      console.log('[Push] Step 5: Saving subscription to server...');
      const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      const data = await safeJsonParse(response);

      if (!data.success) {
        throw new Error(data.error || 'Failed to save subscription');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }));

      console.log('[Push] Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('[Push] Subscription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [getServiceWorkerRegistration, requestPermission, fetchVapidPublicKey]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        setState(prev => ({ ...prev, isLoading: false }));
        return true; // Already not subscribed
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Notify server (don't fail if server request fails)
        try {
          const response = await fetch(`${API_BASE_URL}/push/unsubscribe`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await safeJsonParse(response); // Just to consume the response
        } catch (e) {
          console.warn('[Push] Failed to notify server of unsubscribe:', e);
        }
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      console.log('[Push] Successfully unsubscribed');
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      }));
      return false;
    }
  }, [getServiceWorkerRegistration]);

  /**
   * Send a test notification
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/push/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await safeJsonParse(response);

      if (!data.success) {
        throw new Error(data.error || 'Failed to send test notification');
      }

      return true;
    } catch (error) {
      console.error('[Push] Test notification error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send test',
      }));
      return false;
    }
  }, []);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const initialize = async () => {
      if (!isPushNotificationSupported()) {
        setState(prev => ({
          ...prev,
          permission: 'unsupported',
          isLoading: false,
        }));
        return;
      }

      // Wait for service worker
      const registration = await getServiceWorkerRegistration();

      if (registration) {
        // Check current subscription status
        await checkSubscription();
        // Pre-fetch VAPID key (silently, don't block on this)
        fetchVapidPublicKey().catch(() => { });
      }

      setState(prev => ({ ...prev, isLoading: false }));
    };

    initialize();
  }, [getServiceWorkerRegistration, checkSubscription, fetchVapidPublicKey]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    clearError,
    isPushSupported: isPushNotificationSupported(),
  };
}

export default usePushNotifications;
