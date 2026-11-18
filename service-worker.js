const CACHE_NAME = 'gestao-plantao-offline-v8';
const FIREBASE_FILES = [
  'https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore-compat.js'
];

self.addEventListener('install', event => {
  const root = new URL('./', self.registration.scope);
  const assets = [
    new Request(root.href),
    new Request(new URL('./index.html', self.registration.scope).href),
    new Request(new URL('./manifest.webmanifest', self.registration.scope).href),
    new Request(new URL('./icons/brand-lockup.png', self.registration.scope).href),
    new Request(new URL('./icons/brand-mark.png', self.registration.scope).href),
    new Request(new URL('./icons/icon-192.png', self.registration.scope).href),
    new Request(new URL('./icons/icon-512.png', self.registration.scope).href),
    ...FIREBASE_FILES.map(url => new Request(url, { mode: 'cors' }))
  ];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(assets.map(request => cache.add(request).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('gestao-plantao-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const firebaseAsset = url.origin === 'https://www.gstatic.com' &&
    url.pathname.startsWith('/firebasejs/13.0.0/firebase-') &&
    url.pathname.endsWith('-compat.js');
  if (!sameOrigin && !firebaseAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone()).catch(() => null);
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (sameOrigin && request.mode === 'navigate') {
        return await cache.match(new URL('./', self.registration.scope).href) ||
          await cache.match(new URL('./index.html', self.registration.scope).href) ||
          new Response('Esta página ainda não foi salva para uso offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      return new Response('Este recurso não está disponível offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
