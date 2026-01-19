const CACHE_NAME = 'expensesnap-v4';
const urlsToCache = [
    '/static/css/style.css',
    '/static/js/script.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://unpkg.com/lucide@latest'
];

// ============================================================================
// Installation
// ============================================================================

self.addEventListener('install', event => {
    // Force new service worker to activate immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// ============================================================================
// Fetch Handler (Caching Strategy)
// ============================================================================

self.addEventListener('fetch', event => {
    // Skip POST requests entirely - let browser handle form submissions
    if (event.request.method !== 'GET') {
        return;
    }

    // Network-first strategy for navigation (HTML) requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// ============================================================================
// Activation
// ============================================================================

self.addEventListener('activate', event => {
    // Take control of all clients immediately
    event.waitUntil(clients.claim());

    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// ============================================================================
// Push Notification Handler
// ============================================================================

self.addEventListener('push', event => {
    console.log('[Service Worker] Push received:', event);

    let notificationData = {
        title: 'ExpenseSnap',
        body: 'You have a new notification',
        icon: '/static/icons/icon-192x192.png',
        badge: '/static/icons/icon-72x72.png',
        tag: 'default',
        data: {
            url: '/'
        }
    };

    // Parse the push data if available
    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = {
                ...notificationData,
                ...payload,
                data: {
                    ...notificationData.data,
                    ...(payload.data || {})
                }
            };
        } catch (e) {
            console.error('[Service Worker] Error parsing push data:', e);
            // Try to use the text content as body
            notificationData.body = event.data.text() || notificationData.body;
        }
    }

    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        renotify: notificationData.renotify || false,
        requireInteraction: notificationData.requireInteraction || false,
        data: notificationData.data,
        vibrate: [200, 100, 200],
        timestamp: notificationData.timestamp || Date.now()
    };

    // Add action buttons if provided
    if (notificationData.actions && notificationData.actions.length > 0) {
        options.actions = notificationData.actions;
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
    );
});

// ============================================================================
// Notification Click Handler
// ============================================================================

self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification clicked:', event);

    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};

    // Close the notification
    notification.close();

    // Handle specific actions
    let targetUrl = '/';

    if (action === 'add') {
        // Daily reminder - go to add expense
        targetUrl = '/add-expense';
    } else if (action === 'view') {
        // Budget alert - go to statistics
        targetUrl = '/statistics';
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
            .then(windowClients => {
                // Check if there's already a window open
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    // If we have a matching window, focus it
                    if (client.url.includes(self.registration.scope)) {
                        // Navigate to the target URL
                        if (client.navigate) {
                            return client.navigate(targetUrl).then(client => client.focus());
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

self.addEventListener('notificationclose', event => {
    console.log('[Service Worker] Notification closed:', event);

    // Optional: Track notification dismissals for analytics
    const notification = event.notification;
    const data = notification.data || {};

    // You could send analytics data here if needed
    // For now, just log it
    console.log('[Service Worker] Notification dismissed:', {
        tag: notification.tag,
        type: data.type
    });
});

// ============================================================================
// Push Subscription Change Handler
// ============================================================================

self.addEventListener('pushsubscriptionchange', event => {
    console.log('[Service Worker] Push subscription changed:', event);

    // Handle subscription changes (e.g., when browser refreshes the subscription)
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: event.oldSubscription?.options?.applicationServerKey
        })
        .then(newSubscription => {
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
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update subscription on server');
            }
            console.log('[Service Worker] Subscription updated on server');
        })
        .catch(error => {
            console.error('[Service Worker] Error updating subscription:', error);
        })
    );
});
