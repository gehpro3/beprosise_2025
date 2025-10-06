const CACHE_NAME = 'ginia-blackjack-trainer-v1';
// Add files that make up the app shell to the cache.
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx' 
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // The addAll promise rejects if any of the files fail to cache
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request);
      }
    )
  );
});
