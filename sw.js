const CACHE_NAME = "msquare-v6";

const ASSETS = [
  "/MSquare.github.io/",
  "/MSquare.github.io/index.html",
  "/MSquare.github.io/style.css",
  "/MSquare.github.io/app.js",
  "/MSquare.github.io/apple-touch-icon.png",
  "/MSquare.github.io/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys.map(key => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
          });

          return response;
        })
        .catch(() => {
          return caches.match(
            "/MSquare.github.io/index.html"
          );
        });
    })
  );
});