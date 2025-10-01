
const CACHE = 'bist-pro-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const API_CACHE = 'bist-pro-api-v1';
const API_URLS = [
  'https://api.example.com/bist-data'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== API_CACHE).map(k => caches.delete(k))
    ))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // API istekleri için dinamik önbelleğe alma
  if (API_URLS.some(apiUrl => url.href.includes(apiUrl))) {
    e.respondWith(
      caches.open(API_CACHE).then(cache => {
        return fetch(req)
          .then(res => {
            cache.put(req, res.clone());
            return res;
          })
          .catch(() => caches.match(req));
      })
    );
    return;
  }

  // Statik varlıklar için önbellek stratejisi
  if (req.method === 'GET') {
    e.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => cached || caches.match('./offline.html'));
        return cached || fetchPromise;
      })
    );
  }
});
