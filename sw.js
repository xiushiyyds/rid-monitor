/* RID Station S3 PWA service worker
 * 策略：HTML/导航请求网络优先（保证固件配套页面随时更新），离线回退缓存；
 *       同源静态资源缓存优先+后台更新；高德地图 API 一律不缓存。 */
const CACHE = 'rid-s3-v1';
const SHELL = [
  './s3.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAmap(url) {
  return /(^|\.)(amap\.com|amap\.cn|autonavi\.com)$/.test(url.hostname);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isAmap(url)) return; // 地图 SDK/瓦片走网络，不拦截

  const navigateLike = req.mode === 'navigate' || /\.html(\?.*)?$/.test(url.pathname);

  if (url.origin === self.location.origin && navigateLike) {
    // 页面：网络优先，离线回退缓存
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((h) => h || caches.match('./s3.html')))
    );
    return;
  }

  // 其余同源资源：缓存优先，后台更新
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req)
          .then((resp) => {
            if (resp && resp.ok) {
              const copy = resp.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return resp;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});
