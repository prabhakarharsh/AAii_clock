const CACHE_NAME = 'arc-clock-v1';

// Only cache these exact static files
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use individual try/catch so one missing 
        // file does NOT kill the whole install
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(() => {
              console.warn('SW: could not cache', url);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER intercept these — let them go straight to network:
  // 1. Anthropic API calls
  if (url.hostname === 'api.anthropic.com') return;
  // 2. Google Fonts
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('gstatic.com')) return;
  // 3. Any external CDN
  if (url.hostname !== self.location.hostname) return;
  // 4. POST requests (API calls from the app)
  if (event.request.method !== 'GET') return;

  // For same-origin GET requests: 
  // try cache first, fall back to network
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            // Only cache successful responses
            if (
              response &&
              response.status === 200 &&
              response.type === 'basic'
            ) {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback: serve index.html
            // for navigation requests only
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(
      data.title || '⏰ ARC Clock Alarm',
      {
        body:             data.body || 'Your alarm is ringing!',
        icon:             '/favicon.svg',
        tag:              data.tag || 'arc-alarm',
        requireInteraction: true,
        silent:           false,
      }
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow('/');
      })
  );
});
