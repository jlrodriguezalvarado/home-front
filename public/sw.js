self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let notification = {};
    try {
      const data = event.data ? event.data.json() : {};
      notification = data.notification ?? data ?? {};
    } catch {
      try {
        const text = event.data ? await event.data.text() : '';
        notification = { title: 'Home Manager', body: text || 'New notification' };
      } catch {
        notification = { title: 'Home Manager', body: 'New notification' };
      }
    }
    const data = notification.data ?? {};
    const tag = data.conversationId || data.commerceId || data.jobId || 'home-manager';
    await self.registration.showNotification(notification.title || 'Home Manager', {
      body: notification.body || '',
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/icon-72x72.png',
      data,
      actions: notification.actions || [],
      tag: String(tag),
      renotify: true,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data ?? {};
  const url = payload.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: payload });
          if (client.url.includes(url)) return client.focus();
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
