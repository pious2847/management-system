const CACHE_NAME = 'care-connect-v1';
const urlsToCache = [
  '/',
  '/css/bootstrap.css',
  '/css/maicons.css',
  '/css/theme.css',
  '/fonts/maicons.eot',
  '/fonts/maicons.svg',
  '/fonts/maicons.ttf',
  '/fonts/maicons.woff',
  '/js/app.js',
  '/images/logo.png',
  '/manifest.json',
  // Add other assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error('Failed to cache resources:', err);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});