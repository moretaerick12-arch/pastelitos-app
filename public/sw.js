const CACHE_NAME = 'patria-cache-v4';
const MAP_CACHE_NAME = 'patria-map-tiles-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon.svg',
      ]).catch(() => {
        // Ignore cache failure during install
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MAP_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  // 1. Only intercept GET requests
  if (req.method !== 'GET') {
    return;
  }

  // 2. Bypass Supabase and external API requests completely
  if (url.includes('supabase.co') || url.includes('/api/')) {
    return;
  }

  // 3. Bypass Next.js internal router requests (_rsc, _next/data, etc.)
  if (url.includes('_rsc=') || url.includes('/_next/static/webpack') || url.includes('/_next/data/')) {
    return;
  }

  // 4. Handle OpenStreetMap Map Tiles Caching
  if (url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(req)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(MAP_CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
            }
            return response;
          })
          .catch(() => {
            return new Response('', { status: 408, statusText: 'Timeout' });
          });
      })
    );
    return;
  }

  // 5. Bypass other cross-origin requests
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // 6. Navigation requests (HTML pages) - Network-first with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => {
          return caches.match(req).then((cached) => cached || caches.match('/') || Response.error());
        })
    );
    return;
  }

  // 7. Static assets (images, css, js) - Cache-first with network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Background revalidate
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, res)).catch(() => {});
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => {
          return new Response('', { status: 408, statusText: 'Offline asset' });
        });
    })
  );
});
