self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    const text = event.data?.text();
    payload = text ? { notification: { body: text } } : {};
  }
  const notification = payload.notification ?? payload;
  const data = notification.data ?? {};
  const tag = data.conversationId ?? data.notificationId ?? data.jobId ?? 'home-manager';
  const options = {
    body: notification.body ?? '',
    icon: notification.icon ?? '/icons/icon-192x192.png',
    badge: notification.badge ?? '/icons/icon-72x72.png',
    data,
    tag: String(tag),
    renotify: true,
  };
  if (Array.isArray(notification.actions) && notification.actions.length) {
    options.actions = notification.actions;
  }
  event.waitUntil(
    self.registration.showNotification(notification.title ?? 'Home Manager', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlPath = event.notification.data?.url ?? '/';
  const targetUrl = new URL(urlPath, self.location.origin).href;
  const payload = event.notification.data ?? {};
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: payload });
          if (client.url.startsWith(targetUrl) || client.url.includes(urlPath)) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

try {
  importScripts('ngsw-worker.js');
} catch (e) {
  // ngsw-worker.js is only present in production builds
}
