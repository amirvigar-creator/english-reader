// Service worker: offline support; HTML is network-first (3s timeout) so updates show quickly.
const CACHE = 'english-reader-v6';
const SHELL = ['./', './english-reader-v3.html', './manifest.webmanifest', './icon.svg', './handwriting.ttf'];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  // Each file is cached on its own, so one missing file can't break the install.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('english-reader-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isOwn = url.origin === self.location.origin;
  if (!isOwn && !CDN_HOSTS.includes(url.hostname)) return;
  if (isOwn && (req.mode === 'navigate' || url.pathname.endsWith('.html'))) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = (await c.match(req, { ignoreSearch: true })) || (await c.match('./english-reader-v3.html')) || (await c.match('./'));
      const net = fetch(req).then(res => { if (res && res.ok && !res.redirected) { const cp = res.clone(); e.waitUntil(c.put(req, cp)); } return res; });
      net.catch(() => {});
      if (!hit) return net.catch(() => Response.error());
      return Promise.race([net, new Promise(r => setTimeout(() => r(hit), 3000))]).catch(() => hit);
    })());
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => l.length ? l[0].focus() : self.clients.openWindow('./english-reader-v3.html')));
});
