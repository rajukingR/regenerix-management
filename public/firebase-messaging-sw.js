/* Regenerix push service worker. Shows notifications when the site is closed or in the background.
   The values below are the public web-app identifiers from Firebase (the same ones in src/portal/push.js); they are not secrets. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
    const tab = list.find((c) => c.url.startsWith(self.location.origin));
    if (tab) { try { await tab.navigate(url); return tab.focus(); } catch (e) { /* fall through and open a new tab */ } }
    return self.clients.openWindow(url);
  }));
});

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'AIzaSyCmUSRJNlIcI2k9FkXq_xS-9ujB9uXbwog',
  authDomain: 'push-notification-625ed.firebaseapp.com',
  projectId: 'push-notification-625ed',
  storageBucket: 'push-notification-625ed.firebasestorage.app',
  messagingSenderId: '205908355450',
  appId: '1:205908355450:web:6ca52565eaaeb55f164ec3',
});
// The server sends data-only messages: { title, body, url, type, tag }
firebase.messaging().onBackgroundMessage((payload) => {
  const d = payload.data || {};
  return self.registration.showNotification(d.title || 'Regenerix', { body: d.body || '', tag: d.tag || undefined, data: { url: d.url || '/' } });
});
