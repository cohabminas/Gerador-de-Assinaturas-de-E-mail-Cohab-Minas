/* Cohab Minas | Assinatura: cache versionado e totalmente local. */
const CACHE_NAME = 'cohab-assinatura-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// A instalação só termina quando todos os arquivos essenciais estiverem salvos.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) => Promise.all(
        names.filter((name) => name.startsWith('cohab-assinatura-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Nunca interceptar origens externas ou recursos fora do escopo.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(self.registration.scope ? new URL(self.registration.scope).pathname : '/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // Rotas de navegação desconhecidas exibem o aplicativo, mesmo offline.
    if (request.mode === 'navigate') {
      try {
        const network = await fetch(request);
        if (network.ok && network.type === 'basic') await cache.put(request, network.clone());
        return network;
      } catch {
        return (await cache.match('./index.html')) || Response.error();
      }
    }
    // Outros arquivos locais podem ser armazenados quando obtidos com sucesso.
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  })());
});
