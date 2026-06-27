/* CutcoWithLuke service worker — offline-friendly, cache-first with background refresh */
const CACHE = 'cutco-v1';
const ASSETS = ['/', '/index.html', '/favicon.png', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((resp) => {
        try {
          if (resp && resp.status === 200 && req.url.startsWith(self.location.origin)) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
        } catch (err) {}
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
