// При каждом изменении index.html/картинок меняйте номер версии,
// иначе у пользователей останется старая версия из кэша.
const CACHE_NAME = "menu-v5";

// Пути относительные (от расположения sw.js), поэтому один и тот же
// файл работает и в /menu.github.io/, и в /Menubeta.github.io/
const ASSETS = [
  "./",
  "./index.html",
  "./logo_menu.png",
  "./apple-touch-icon.png",
  "./manifest.json"
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
    caches.match(event.request)
      .then(cached => {
        return (
          cached ||
          fetch(event.request).then(response => {
            // Кэшируем только успешные ответы (не 404/ошибки)
            // и шрифты Google (они приходят как "opaque")
            if (response.ok || response.type === "opaque") {
              const copy = response.clone();

              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, copy);
              });
            }

            return response;
          })
        );
      })
  );
});
