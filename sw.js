// Clean-up: the shop site that used this domain before may have installed a "service worker" in visitors' browsers,
// which can keep showing the old pages. If one was registered at this address, this replaces it, removes itself
// and reloads open tabs so the new site appears. Harmless when nothing was installed.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch (e) {}
  await self.registration.unregister();
  const tabs = await self.clients.matchAll({ type: 'window' });
  tabs.forEach(tab => tab.navigate(tab.url));
})()));
