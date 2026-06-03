const CACHE_NAME = "chamados-ti-shell-v9";
const SHELL_FILES = [
  "/",
  "/index.html",
  "/painel.html",
  "/styles.css?v=20260603-24",
  "/app.js?v=20260603-22",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
