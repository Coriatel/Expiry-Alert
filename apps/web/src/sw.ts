/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Runtime Caching
// Google Fonts
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

// API
registerRoute(/\/api\/.*/i, new NetworkOnly());

self.addEventListener("push", (event) => {
  const data = event.data?.json();
  const title = data.title || "Expiry Alert";
  const options: NotificationOptions & {
    renotify?: boolean;
    actions?: Array<{ action: string; title: string }>;
  } = {
    body: data.body,
    icon: data.icon || "/icon-192-v2.png",
    badge: data.badge || "/icon-badge-72-v2.png",
    tag: data.tag,
    renotify: !!data.tag,
    data: data.data,
    actions: [
      { action: "snooze", title: "הזכר לי מחר" },
      { action: "dismiss", title: "אל תזכיר לי יותר" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const { action, notification } = event;
  notification.close();

  const notifData = notification.data || {};
  const baseUrl = self.location.origin;

  // Alerts are grouped per team, so the payload carries reagentIds (plural).
  const reagentIds: number[] =
    notifData.reagentIds ?? (notifData.reagentId ? [notifData.reagentId] : []);
  const postForEach = (path: string, body: unknown) =>
    Promise.all(
      reagentIds.map((id) =>
        fetch(`${baseUrl}/api/notifications/${id}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }),
      ),
    ).catch((err) => console.error(`${path} failed:`, err));

  if (action === "snooze" && reagentIds.length > 0) {
    event.waitUntil(postForEach("snooze", { days: 1 }));
    return;
  }

  if (action === "dismiss" && reagentIds.length > 0) {
    event.waitUntil(
      postForEach(
        "dismiss",
        notifData.alertType ? { alertType: notifData.alertType } : {},
      ),
    );
    return;
  }

  // Default: open or focus the app
  const urlToOpen = notifData.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});
