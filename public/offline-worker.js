/*
 * Koink offline worker (PWA service worker).
 * Provides offline capabilities, shell precaching, and notification clicks.
 */
const BUILD = 'koink-shell-v1';
const CACHE = BUILD;
const SCOPE = self.registration.scope;
const SHELL = new URL('./', SCOPE).href;
const PRECACHE = [
  './',
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];

const isHtml = (response) => (response.headers.get('content-type') || '').includes('text/html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.add(new Request(SHELL, { cache: 'reload' })).catch(() => undefined);
    await Promise.all(PRECACHE.map(async (file) => {
      try {
        const url = new URL(file, SCOPE).href;
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        /* Best-effort caching for non-critical assets */
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const old = (key) => (key.startsWith('koink-shell-') || key.startsWith('koins-shell-')) && key !== CACHE;
    await Promise.all(keys.filter(old).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;

  // Let browser handle downloads and brand direct links
  if (url.href.startsWith(new URL('downloads/', SCOPE).href) || url.href.startsWith(new URL('brand/', SCOPE).href)) return;

  // Navigation requests: network first, fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok && isHtml(response)) {
          await cache.put(SHELL, response.clone());
        }
        return response;
      } catch {
        return (await cache.match(SHELL)) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Assets: cache first, network fallback
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request.url);
    if (hit) return hit;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic' && !isHtml(response)) {
        try {
          await cache.put(request.url, response.clone());
        } catch {
          /* Storage limits guard */
        }
      }
      return response;
    } catch {
      return hit || Response.error();
    }
  })());
});

// Reminder notifications click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.target;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find((candidate) => candidate.url.startsWith(SCOPE));
    if (client) {
      await client.focus().catch(() => undefined);
      client.postMessage({ type: 'koink:open', target });
      return;
    }
    await self.clients.openWindow(new URL(target ? `./?open=${encodeURIComponent(target)}` : './', SCOPE).href);
  })());
});
