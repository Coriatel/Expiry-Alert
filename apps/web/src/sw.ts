/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

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
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-badge-72.png",
    tag: data.tag,
    renotify: !!data.tag,
    data: data.data,
    actions: [
      { action: "snooze", title: "Remind Later" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const { action, notification } = event;
  notification.close();

  const notifData = notification.data || {};
  const baseUrl = self.location.origin;

  if (action === "snooze" && notifData.reagentId) {
    // Snooze for 1 day via API
    event.waitUntil(
      fetch(`${baseUrl}/api/notifications/${notifData.reagentId}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days: 1 }),
      }).catch((err) => console.error("Snooze failed:", err)),
    );
    return;
  }

  if (action === "dismiss" && notifData.reagentId) {
    // Dismiss via API with alertType
    const body: any = {};
    if (notifData.alertType) body.alertType = notifData.alertType;
    event.waitUntil(
      fetch(`${baseUrl}/api/notifications/${notifData.reagentId}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      }).catch((err) => console.error("Dismiss failed:", err)),
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
