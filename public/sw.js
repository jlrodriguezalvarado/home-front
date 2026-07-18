self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const n = data.notification ?? {};
  event.waitUntil(
    self.registration.showNotification(n.title ?? 'New message', {
      body: n.body,
      icon: n.icon ?? '/icons/icon-192x192.png',
      badge: n.badge ?? '/icons/icon-72x72.png',
      data: n.data ?? {},
      actions: n.actions ?? [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  const payload = event.notification.data ?? {};
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.postMessage({ type: 'NOTIFICATION_CLICK', data: payload });
          if (c.url.includes(url)) return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

try {
  importScripts('ngsw-worker.js');
} catch (e) {
  // ngsw-worker.js is only present in production builds
}
