// PDF44 Service Worker — v5
// PWA offline caching

// ── PDF44 PWA caching ─────────────────────────────────────────────
const CACHE_NAME    = 'pdf44-v5';
const RUNTIME_CACHE = 'pdf44-runtime-v5';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Domains to never intercept (ads, analytics)
const AD_DOMAINS = [
  'highperformanceformat.com', 'adsterra.com',
  'googlesyndication.com', 'doubleclick.net',
  'analytics.google.com', 'googletagmanager.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => caches.open(RUNTIME_CACHE))
      .then((cache) => Promise.allSettled(
        CDN_ASSETS.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept ad/push/analytics traffic — let it go straight to network
  if (AD_DOMAINS.some((d) => url.hostname.includes(d))) return;

  // Network-first for page navigations
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for app shell + CDN assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(RUNTIME_CACHE)
          .then((cache) => cache.put(req, copy))
          .catch(() => {});
        return response;
      }).catch(() => {
        if (req.destination === 'image') {
          return new Response('', { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
        }
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
