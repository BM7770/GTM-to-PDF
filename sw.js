/* Gemara Translator — service worker.
 * App files are network-first (cached for offline use); tractate CSVs and vocabulary batches are cached the
 * first time they are used (network-first, so updates in the repository are
 * picked up when online, and the cached copy is used offline). */
const VERSION = "gt-app-v1.2";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "data-index.json",
  "css/app.css", "css/pdf.css", "fonts/fonts.css",
  "js/config.js", "js/auth.js", "js/remote.js", "js/i18n-site.js", "vocab/g.json", "vocab/m.json", "vocab/t.json", "js/i18n.js", "js/engine.js", "js/data.js", "js/sheet.js", "js/app.js", "js/motion.js", "icons/gtm-logo.png",
  "vendor/jspdf.umd.min.js", "vendor/html-to-image.js", "fonts/Rubik-hebrew.woff2",
  "icons/logo-128.png", "icons/icon-192.png", "icons/favicon-48.png", "img/talmud.jpg", "img/tanach.jpg", "img/mishnah.jpg",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k.startsWith("gt-app-")).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isData = /\/data\//.test(url.pathname) || url.hostname === "raw.githubusercontent.com" || /data-index\.json$/.test(url.pathname);
  if (isData) {
    // Network first, fall back to cache (keeps the vocabulary current, works offline).
    e.respondWith(fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(k => k.put(req, c)); } return res; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || Response.error())));
    return;
  }
  if (url.origin !== location.origin) return;
  // App files: network first (always the newest version online), cache as offline fallback.
  e.respondWith(fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(k => k.put(req, c)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || Response.error())));
});
