import { apiFetch } from "@/lib/http";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/;

export const PUSH_ERROR_CODES = {
  iosHomeScreenRequired: "push_ios_home_screen_required",
  unsupported: "push_unsupported",
} as const;

export type PushSupportState = {
  supported: boolean;
  reason?: "ios-home-screen" | "unsupported";
  isIos: boolean;
  isStandalone: boolean;
  error: string | null;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function requestNotificationPermission() {
  if (typeof Notification === "undefined") {
    throw new Error(PUSH_ERROR_CODES.unsupported);
  }

  if (Notification.requestPermission.length > 0) {
    return new Promise<NotificationPermission>((resolve) => {
      Notification.requestPermission(resolve);
    });
  }

  return Notification.requestPermission();
}

export function getPushSupportState(): PushSupportState {
  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";
  const isIos =
    hasNavigator && IOS_DEVICE_PATTERN.test(navigator.userAgent ?? "");
  const isStandalone = hasWindow && isStandaloneDisplayMode();
  const isSecureContext = hasWindow ? window.isSecureContext === true : false;
  const hasNotificationApi = hasWindow && "Notification" in window;
  const hasServiceWorker = hasNavigator && "serviceWorker" in navigator;
  const hasPushManager = hasWindow && "PushManager" in window;

  if (isIos && !isStandalone) {
    return {
      supported: false,
      reason: "ios-home-screen",
      isIos,
      isStandalone,
      error:
        "On iPhone, install the app to the Home Screen before enabling notifications",
    };
  }

  if (!isSecureContext) {
    return {
      supported: false,
      reason: "unsupported",
      isIos,
      isStandalone,
      error: "Push notifications require a secure HTTPS connection",
    };
  }

  if (!hasNotificationApi || !hasServiceWorker || !hasPushManager) {
    return {
      supported: false,
      reason: "unsupported",
      isIos,
      isStandalone,
      error: "Push notifications are not supported on this device",
    };
  }

  return {
    supported: true,
    isIos,
    isStandalone,
    error: null,
  };
}

export async function subscribeToPush() {
  const supportState = getPushSupportState();
  if (!supportState.supported) {
    throw new Error(
      supportState.reason === "ios-home-screen"
        ? PUSH_ERROR_CODES.iosHomeScreenRequired
        : PUSH_ERROR_CODES.unsupported,
    );
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error("VAPID public key not configured");
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  const createdNewSubscription = !subscription;
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  try {
    await apiFetch<void>("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    if (createdNewSubscription) {
      await subscription.unsubscribe().catch(() => undefined);
    }
    throw error;
  }

  return subscription;
}

export async function unsubscribeFromPush() {
  const supportState = getPushSupportState();
  if (!supportState.supported) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  try {
    await apiFetch<void>("/api/push/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (error) {
    console.error("Failed to remove push subscription from the server", error);
  } finally {
    await subscription.unsubscribe();
  }
}

export async function checkPushSubscription() {
  const supportState = getPushSupportState();
  if (!supportState.supported) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function sendTestPushNotification() {
  return apiFetch<{ success: boolean; sent?: number }>("/api/push/test", {
    method: "POST",
  });
}
