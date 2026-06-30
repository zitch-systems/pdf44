// PDF44 Service Worker — v8
// PWA offline caching

// ── PDF44 PWA caching ─────────────────────────────────────────────
// Bumped v6 → v7: the old worker cached EVERY GET (incl. Supabase entitlement
// reads and config.js) cache-first with no revalidation, so a cancelled/expired
// subscription kept reading "premium" forever.
// Bumped v7 → v8: also treat the account/billing controller
// (/assets/pdf44-account.js) as always-fresh (network-first). It was still
// served cache-first, so a shipped fix to the isPremium()/subscription/checkout
// logic wouldn't reach installed-PWA users until the next cache bump. Bumping
// the cache name evicts any already-poisoned runtime cache (config.js or
// account.js) on existing clients.
const CACHE_NAME    = 'pdf44-v8';
const RUNTIME_CACHE = 'pdf44-runtime-v8';

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

// Domains to never intercept (ads)
const AD_DOMAINS = [
  'highperformanceformat.com', 'adsterra.com',
  'googlesyndication.com', 'doubleclick.net'
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

// Cross-origin API/auth/billing calls that must ALWAYS hit the network — never be
// served from a stale cache. Caching Supabase REST reads (subscriptions/profiles/
// site_settings) was making a cancelled or expired subscription keep reading
// "premium" indefinitely on the device.
function isNeverCache(url) {
  const h = url.hostname;
  return h.endsWith('.supabase.co') || h.endsWith('.paystack.co') || h === 'api.paystack.co';
}

// Same-origin scripts that carry LIVE entitlement/billing logic must stay fresh
// so a flipped ad kill-switch, rotated key, or shipped billing fix reaches
// returning users: config.js (flags + public keys) and the account controller
// pdf44-account.js (isPremium()/subscription + checkout logic). Both are served
// network-first below, falling back to cache only when offline.
function isRuntimeConfig(url) {
  if (url.origin !== self.location.origin) return false;
  return /(^|\/)config\.js(\?|$)/.test(url.pathname)
      || /\/assets\/pdf44-account\.js(\?|$)/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept ad/push/analytics traffic — let it go straight to network
  if (AD_DOMAINS.some((d) => url.hostname.includes(d))) return;

  // Never intercept (or cache) Supabase/Paystack — entitlement + billing are live.
  if (isNeverCache(url)) return;

  // Runtime config: network-first so flipped flags / rotated keys propagate;
  // fall back to the cached copy only when offline.
  if (isRuntimeConfig(url)) {
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Network-first for page navigations
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for app shell + CDN assets (versioned / immutable)
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
