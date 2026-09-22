// Dedicated service worker for /kids.html, registered at that exact scope
// so it takes precedence over the main site's root-scoped sw.js there.
// This keeps the two installed apps from sharing a controller (and, with
// each manifest declaring its own "id", from sharing an install identity
// on Android).
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {});
