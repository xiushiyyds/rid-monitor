/* RID Station S3 PWA service worker —— 纯透传·自愈版
 * 职责：仅配合 manifest 提供「可安装/全屏」能力；不拦截、不缓存任何请求，
 *       所有资源一律直连网络，彻底避免缓存导致的页面/按钮异常。
 * 自愈：activate 时清除本站点历史全部缓存版本（含旧的 rid-s3-v1）。 */

self.addEventListener('install', () => {
  // 立即激活，不等旧 SW 退出
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) // 清空所有旧缓存
      .then(() => self.clients.claim()) // 立即接管页面
  );
});

// fetch 事件刻意不调用 respondWith：
// 所有请求（页面/脚本/地图/接口）都走浏览器默认网络流程，SW 完全透明。
self.addEventListener('fetch', () => {});
