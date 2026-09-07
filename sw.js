const CACHE_NAME = 'beats-pwa-v1';

// Core assets required for the app shell to load offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.svg'
];

// 1. Install Event: Pre-cache the core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

// 2. Activate Event: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  // Ensure the service worker takes control of the page immediately
  self.clients.claim();
});

// 3. Fetch Event: Stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  // Only process GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass cache for external media to prevent bloating local storage with MP3s
  if (url.hostname.includes('media.')) {
    return;
  }

  // Stale-while-revalidate: Serve from cache immediately, then update cache in the background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid, local responses (type 'basic')
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse); // Fallback to cache if network fails entirely

      // Return the cached response right away if it exists, otherwise wait for the network
      return cachedResponse || fetchPromise;
    })
  );
});
