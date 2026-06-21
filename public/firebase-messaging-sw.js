/* Firebase Cloud Messaging service worker (background push). Separate from app-shell SW. */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Config is injected at runtime via ?config= query param when the SW is registered.
const params = new URL(self.location.href).searchParams;
const configParam = params.get('config');
let firebaseConfig = null;
try { firebaseConfig = configParam ? JSON.parse(decodeURIComponent(configParam)) : null; } catch (_) {}

if (firebaseConfig && firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'UniGenius AI';
    const body = payload.notification?.body || payload.data?.body || '';
    const link = payload.data?.link || '/';
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { link, ...(payload.data || {}) },
      tag: payload.data?.notification_id || undefined,
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        client.navigate(link).catch(() => {});
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(link);
  })());
});
