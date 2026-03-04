/**
 * ExpenseSnap Service Worker
 *
 * Handles push notifications, offline caching, and PWA support.
 * This file must be in the public/ folder to be served at the root.
 */

const CACHE_NAME = 'expensesnap-v7';

// Assets to pre-cache on install (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ============================================================================
// API URL Configuration - Dynamically detect production vs development
// ============================================================================

/**
 * Get the API base URL based on the current origin.
 * In production (Vercel), this points to the Render backend.
 * In development, it uses relative URLs.
 */
function getApiBaseUrl() {
  const origin = self.location.origin;

  // Production: Vercel frontend -> Render backend
  if (origin.includes('vercel.app') || origin.includes('expense-snap')) {
    return 'https://expensesnap-crp6.onrender.com/api';
  }

  // Development: Use relative URL (same origin)
  return '/api';
}

const API_BASE_URL = getApiBaseUrl();

// ============================================================================
// Caching Helpers
// ============================================================================

/**
 * Check if a request is an API call.
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api') ||
    url.hostname.includes('onrender.com') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/logout');
}

/**
 * Check if a request is for a static asset that should be cached.
 */
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot|ico|json)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');
}

/**
 * Check if a request is a navigation request (HTML page).
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// ============================================================================
// Installation - Pre-cache app shell
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v7...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Force new service worker to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Pre-cache failed:', error);
        // Still skip waiting even if pre-cache fails
        return self.skipWaiting();
      })
  );
});

// ============================================================================
// Activation - Clean up old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker v7 activated');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return clients.claim();
      })
  );
});

// ============================================================================
// Fetch Handler - Dual Caching Strategy
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests for caching
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // ---- Strategy 1: Network First for API calls ----
  if (isApiRequest(url)) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // ---- Strategy 2: Cache First for static assets ----
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // ---- Strategy 3: Network First for navigation (HTML pages) ----
  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(networkFirstStrategy(event.request));
});

/**
 * Network First Strategy:
 * Try the network first. If it succeeds, cache the response and return it.
 * If the network fails, return the cached version (if available).
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      // Clone the response because it can only be consumed once
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // For navigation requests, return the cached index.html (SPA fallback)
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) {
        return fallback;
      }
    }

    // Nothing in cache either - return a basic offline response
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Cache First Strategy:
 * Check the cache first. If found, return the cached response.
 * If not cached, fetch from network, cache it, and return.
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache miss and network failed for:', request.url);

    return new Response('', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// ============================================================================
// Push Notification Handler
// ============================================================================

/**
 * Safely parse push event data.
 * Handles empty payloads, plain text, and JSON.
 *
 * @param {PushEvent} event - The push event
 * @returns {Object} Parsed notification data
 */
function parsePushData(event) {
  const defaults = {
    title: 'ExpenseSnap',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: '/' }
  };

  // No data at all - return defaults
  if (!event.data) {
    console.log('[SW] Push received with no data, using defaults');
    return defaults;
  }

  // Get the raw text FIRST (before trying json() which consumes the stream)
  let rawText = '';
  try {
    rawText = event.data.text();
  } catch (e) {
    console.warn('[SW] Could not read push data as text:', e);
    return defaults;
  }

  // Empty string - return defaults
  if (!rawText || rawText.trim() === '') {
    console.log('[SW] Push received with empty data, using defaults');
    return defaults;
  }

  // Try to parse as JSON
  try {
    const payload = JSON.parse(rawText);
    console.log('[SW] Push data parsed as JSON:', payload);

    return {
      title: payload.title || defaults.title,
      body: payload.body || defaults.body,
      icon: payload.icon || defaults.icon,
      badge: payload.badge || defaults.badge,
      tag: payload.tag,
      renotify: payload.renotify,
      requireInteraction: payload.requireInteraction,
      actions: payload.actions,
      data: {
        ...defaults.data,
        ...(payload.data || {})
      }
    };
  } catch (e) {
    // Not JSON - treat as plain text body (e.g., DevTools test push)
    console.log('[SW] Push data is plain text:', rawText);
    return {
      ...defaults,
      body: rawText
    };
  }
}

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  // Parse the push data safely
  const notificationData = parsePushData(event);

  // Generate unique tag if not provided to ensure each notification shows
  // Using timestamp ensures repeated pushes always show a new notification
  const tag = notificationData.tag || `expensesnap-${Date.now()}`;

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: tag,
    // IMPORTANT: renotify must be true when using same tag to show notification again
    renotify: notificationData.renotify !== undefined ? notificationData.renotify : true,
    requireInteraction: notificationData.requireInteraction || false,
    data: notificationData.data,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  // Add action buttons if provided
  if (notificationData.actions && notificationData.actions.length > 0) {
    options.actions = notificationData.actions;
  }

  console.log('[SW] Showing notification:', notificationData.title, options);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('[SW] Notification shown successfully');
      })
      .catch((error) => {
        console.error('[SW] Failed to show notification:', error);
      })
  );
});

// ============================================================================
// Notification Click Handler
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Handle specific actions
  let targetUrl = '/';

  if (action === 'add') {
    // Daily reminder - go to add expense
    targetUrl = '/?screen=add-expense';
  } else if (action === 'view') {
    // Budget alert - go to statistics
    targetUrl = '/?screen=statistics';
  } else if (action === 'dismiss') {
    // Just close the notification, don't open anything
    return;
  } else if (data.url) {
    // Use the URL from notification data
    targetUrl = data.url;
  }

  // Try to focus an existing window or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // If we have a matching window, focus it
          if (client.url.includes(self.registration.scope)) {
            // Navigate to the target URL
            if (client.navigate) {
              return client.navigate(targetUrl).then((c) => c.focus());
            }
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ============================================================================
// Notification Close Handler
// ============================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// ============================================================================
// Push Subscription Change Handler
// ============================================================================

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    })
      .then((newSubscription) => {
        // Send the new subscription to the server using dynamic API URL
        return fetch(`${API_BASE_URL}/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSubscription.toJSON()),
          credentials: 'include'
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to update subscription on server');
        }
        console.log('[SW] Subscription updated on server');
      })
      .catch((error) => {
        console.error('[SW] Error updating subscription:', error);
      })
  );
});

// ============================================================================
// Error Handler
// ============================================================================

self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});
