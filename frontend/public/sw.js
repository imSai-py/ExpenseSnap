/**
 * ExpenseSnap Service Worker
 *
 * Handles push notifications and caching for the PWA.
 * This file must be in the public/ folder to be served at the root.
 */

const CACHE_NAME = 'expensesnap-v5';

// ============================================================================
// Installation
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  // Force new service worker to activate immediately
  self.skipWaiting();
});

// ============================================================================
// Activation
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

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
    icon: '/vite.svg',
    badge: '/vite.svg',
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
      // Send the new subscription to the server
      return fetch('/api/push/subscribe', {
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
