const CACHE_NAME = "msquare-v5";

const ASSETS = [
  "/MSquare.github.io/",
  "/MSquare.github.io/index.html",
  "/MSquare.github.io/logo_menu.png",
  "/MSquare.github.io/apple-touch-icon.png",
  "/MSquare.github.io/manifest.json"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.map(k => k !== CACHE && caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
