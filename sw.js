// Service worker: makes the app work offline and always fetches the newest HTML when online.
const CACHE = 'english-reader-v4';
const SHELL = ['./english-reader-v3.html', './manifest.webmanifest', './icon.svg'];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isOwn = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.includes(url.hostname);
  if (!isOwn && !isCdn) return;

  // HTML pages: try the network first so updates appear right away; use the cache when offline.
  if (isOwn && (req.mode === 'navigate' || url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./english-reader-v3.html')))
    );
    return;
  }

  // Everything else (icons, manifest, CDN libraries, fonts): cache first.
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      });
    })
  );
});
