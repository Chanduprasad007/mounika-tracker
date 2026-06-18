const CACHE_NAME = 'mouni-baby-hub-v3';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching files');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor: Network-First for page navigation, Stale-While-Revalidate for static assets
self.addEventListener('fetch', event => {
  const isHtml = event.request.mode === 'navigate' || 
                 (event.request.method === 'GET' && 
                  event.request.headers.get('accept') && 
                  event.request.headers.get('accept').includes('text/html'));

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            fetch(event.request)
              .then(networkResponse => {
                if (networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
                }
              })
              .catch(() => {});
            return cachedResponse;
          }
          return fetch(event.request);
        })
    );
  }
});
