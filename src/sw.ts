/// <reference lib="webworker" />
// service worker：事前キャッシュ・通知の表示・通知を押したときに開く
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// 新しい版は入ったらすぐ有効にする。開いている画面はそのまま、次に開いたときに切り替わる
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

type PushPayload = { title?: string; body?: string; url?: string };

self.addEventListener('push', (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  const title = data.title ?? '買い物';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body ?? '',
      icon: `${self.registration.scope}icons/icon-192.png`,
      data: { url: data.url ?? '#/list' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const hash = (event.notification.data?.url as string | undefined) ?? '#/list';
  const target = `${self.registration.scope}${hash}`;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if (w.url.startsWith(self.registration.scope)) {
          await w.focus();
          await w.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
