const CACHE_NAME = 'beprosise-blackjack-trainer-v2';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx', // main entry point
  'https://cdn.glitch.global/c8227099-198c-4573-a8f8-a1470a6f444c/icon-192x192.png', // Main icon
];
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'aistudiocdn.com',
  'cdn.pixabay.com',
  'cdn.glitch.global'
];

// Install: Caches the app shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch(error => {
        console.error('Failed to cache app shell:', error);
      })
  );
});

// Activate: Cleans up old caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
              console.log('Service Worker: Deleting old cache', name);
              return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim()) // Take control of open pages
  );
});

// Fetch: Implements caching strategies.
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and requests to the Gemini API
  if (request.method !== 'GET' || url.hostname.includes('googleapis.com')) {
    return; // Let the browser handle it
  }

  // Strategy for CDN assets: Stale-While-Revalidate
  // This strategy provides a fast response from the cache (if available)
  // while simultaneously fetching an updated version from the network
  // to refresh the cache for the next visit.
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          // Kick off a network request to fetch the latest version.
          const fetchPromise = fetch(request).then(networkResponse => {
            // If the fetch is successful, update the cache with the fresh response.
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            console.warn(`Service Worker: Fetch failed for CDN asset: ${request.url}`, err);
            // The fetch failed, but if we served a cached response, the user won't notice.
          });

          // Return the cached response immediately if it exists, otherwise wait for the network.
          // This is the "stale-while-revalidate" part: serve stale content first, revalidate in background.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // Strategy for local app files: Cache-First
  // This ensures the app loads instantly from the cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not in cache, fetch from network and then cache it.
        return fetch(request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }
});
