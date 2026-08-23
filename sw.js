const CACHE_NAME = 'anime-pilgrimage-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './prototype/homepage.html',
  './prototype/homepage-ja.html',
  './prototype/map-leaflet.html',
  './prototype/map-leaflet-ja.html',
  './prototype/about.html',
  './prototype/privacy.html',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Network-first for same-origin requests: visitors get the latest content
// whenever they're online (this site ships frequent updates), and fall
// back to whatever was last cached when offline — e.g. a pilgrimage spot
// with no signal. Successful responses refresh the cache as they arrive.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
