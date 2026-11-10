// Quota – service worker: l'app funziona anche offline.
// Aumentare VERSION a ogni rilascio per aggiornare la cache sui telefoni.
const VERSION = 'quota-v7';
const SHELL = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'busta-profili.js',
  'busta.js',
  'vendor/pdfjs/pdf.min.js',
  'vendor/pdfjs/pdf.worker.min.js',
  'manifest.webmanifest',
  'data/riferimenti.json',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Dati pubblici: prima la rete (per avere gli aggiornamenti), poi la cache.
  if (url.pathname.endsWith('/data/riferimenti.json')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Resto dell'app: prima la cache, poi la rete.
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
