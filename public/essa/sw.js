/*
 * Service worker for /essa/ ONLY — Essa's private share page.
 *
 * SCOPE IS THE WHOLE POINT OF THIS FILE'S LOCATION. A service worker's default
 * scope is its own directory, so this lives at /essa/sw.js and can only ever
 * control /essa/. Moving it to the site root would silently hand it control of
 * eyshandyman.com — every service page, every customer — where a stale cache
 * would serve outdated copy and prices. Do not move it.
 *
 * Bump CACHE whenever the precache list changes; `activate` deletes every other
 * cache this origin holds under the eys-essa- prefix.
 */
const CACHE = 'eys-essa-v1';
const SCOPE_PATH = '/essa/';
const PRECACHE = [
  '/essa/',
  '/essa/manifest.webmanifest',
  '/essa/icon-192.png',
  '/essa/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('eys-essa-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }
  // Belt and braces: scope already limits this worker to /essa/, but never
  // touch anything else even if that ever changes.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;

  // Network first, so a deployed change to the links or the messages reaches
  // him the next time he opens the app. The cache is the offline fallback,
  // never the default answer.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((hit) => {
          if (hit) return hit;
          if (request.mode === 'navigate') return caches.match('/essa/');
          return Response.error();
        }),
      ),
  );
});
