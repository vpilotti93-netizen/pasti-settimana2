/**
 * Service Worker - Pasti della settimana
 * Enables 100% offline access, instant loading, and safe updates.
 * LocalStorage data is never touched or affected by service worker lifecycle.
 */

const CACHE_NAME = 'pasti-settimana-v1';

// Assets to precache (using relative paths for GitHub Pages subfolder compatibility)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './src/logic.js',
  './src/zip-builder.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png',
  './favicon.ico'
];

// Install: precache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll with error resilience: cache what succeeds
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Precache fallback for ${url}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up older cache versions, claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`[SW] Rimozione vecchia cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate / Cache First with network fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore cross-origin external requests if any
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((error) => {
        // If offline and not in cache, fallback to index.html if navigating
        if (event.request.mode === 'navigate') {
          return caches.match('./') || caches.match('./index.html');
        }
        throw error;
      });

      // Return cached response immediately if available, while fetching update in background
      return cachedResponse || fetchPromise;
    })
  );
});
