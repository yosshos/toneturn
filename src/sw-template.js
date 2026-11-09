// The 7th Sense service worker (generated at build: __VERSION__ / __BUILD__).
// - App-shell offline loading (this says nothing about offline speech recognition).
// - Waits for the player to choose "Update now" before activating a new version.
// - Shows streak-reminder push notifications.
const VERSION = '__VERSION__';
const BUILD = '__BUILD__';
const CACHE = `toneturn-${VERSION}-${BUILD}`;
const PRECACHE = __PRECACHE__;
const BASE = '__BASE__';
/** Instrument samples (spec Q): downloaded on first use, kept across app versions. */
const SAMPLES = 'toneturn-samples-v1';
/**
 * The on-device narrator (Kokoro, 0.65): its worker script and onnxruntime's WASM, fetched on first English line,
 * kept across app versions (only files this build no longer uses are dropped). The model weights themselves come
 * from huggingface.co and are cached by the library (Cache API 'transformers-cache'); the SW never sees them.
 */
const VOICE = 'toneturn-voice-v1';
const VOICE_FILES = __VOICE_FILES__;
const isVoiceFile = (p) => /\/assets\/(kokoroWorker-[^/]*\.js|ort-wasm[^/]*\.wasm)$/.test(p);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  // No skipWaiting here: the page asks for it when the player taps "Update now".
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'VERSION') e.source && e.source.postMessage({ type: 'VERSION', version: VERSION, build: BUILD });
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('toneturn-') && k !== CACHE && k !== SAMPLES && k !== VOICE).map((k) => caches.delete(k))))
      // narrator files of older builds leave the device
      .then(() => caches.open(VOICE))
      .then((c) => c.keys().then((reqs) => Promise.all(reqs.filter((r) => !VOICE_FILES.includes(new URL(r.url).pathname)).map((r) => c.delete(r)))))
      // sample sets that were replaced (0.54: the 4-layer grand → 16 layers) leave the device
      .then(() => caches.open(SAMPLES))
      .then((c) => c.keys().then((reqs) => Promise.all(reqs.filter((r) => /\/samples\/grand-(pp|mp|mf|f)\//.test(r.url)).map((r) => c.delete(r)))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(BASE + 'index.html')));
    return;
  }
  if (isVoiceFile(url.pathname)) {
    // cache-first: hashed names never change content
    e.respondWith(
      caches.open(VOICE).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) c.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }
  if (url.pathname.startsWith(BASE + 'samples/')) {
    e.respondWith(
      caches.open(SAMPLES).then((c) =>
        // The list of sets is network-first (new instruments appear); the audio files are cache-first.
        url.pathname.endsWith('manifest.json')
          ? fetch(req)
              .then((res) => {
                if (res.ok) c.put(req, res.clone());
                return res;
              })
              .catch(() => c.match(req))
          : c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) c.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && url.pathname.startsWith(BASE + 'assets/')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : '' };
  }
  const title = data.title || 'The 7th Sense';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Keep your streak alive — one short lesson.',
      icon: BASE + 'icon.svg',
      badge: BASE + 'icon.svg',
      tag: data.tag || 'streak',
      data: { url: data.url || BASE },
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || BASE;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list)
        if ('focus' in c) {
          // A duel notification opens Friends in the running app.
          if (url !== BASE && url.includes('#') && 'navigate' in c) return c.focus().then(() => c.navigate(url));
          return c.focus();
        }
      return self.clients.openWindow(url);
    }),
  );
});
