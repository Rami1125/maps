// Service Worker for "נועה AI — מוח לוגיסטי | ח. סבן חומרי בניין (1994) בע״מ"
const CACHE_NAME = 'saban-maps-pwa-v1';

const STATIC_ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg',
  '/pwa-192x192.jpg',
  '/pwa-512x512.jpg',
  '/apple-touch-icon.jpg',
  'https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Heebo:wght@400;500;600;700;800;900&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

// Install Event - Pre-cache critical offline assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Saban PWA SW] Pre-caching static assets for offline use');
      return cache.addAll(STATIC_ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Saban PWA SW] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && !key.startsWith('onesignal')) {
            console.log('[Saban PWA SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate & Network-First with Cache Fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests, browser extensions, and external third-party APIs
  if (
    request.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.protocol.startsWith('moz-extension') ||
    url.hostname.includes('execute-api') ||
    url.hostname.includes('amazonaws.com') ||
    url.hostname.includes('onesignal.com') ||
    url.hostname.includes('make.com') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('waze.com') ||
    url.hostname.includes('google.com')
  ) {
    return;
  }

  // Map tiles caching (Stale While Revalidate)
  if (url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('cartocdn.com')) {
    event.respondWith(
      caches.open('saban-map-tiles-cache').then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // HTML / App Navigation (Network-First, fallback to Cache)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // Static Assets (Cache-First with Network Fallback)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(request);
        });
    })
  );
});

// Message Event - Handle Window Messages & postMessage safely
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({ status: 'ok', sw: 'saban-maps-pwa' });
  }
});

