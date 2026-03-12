import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_VAPID_KEY =
  "BHbBIKpE42wijbjt8abOG1HCj6ml7BgR-vZ1bW_owDBoJkyTNRA3J9KUhtcCnk1epT3fikDMClf9ln2M1Qhlrd8";
type RequestPermissionFn = (
  deprecatedCallback?: NotificationPermissionCallback,
) => Promise<NotificationPermission>;

type PushEnvironmentOptions = {
  userAgent?: string;
  standalone?: boolean;
  secure?: boolean;
  hasNotification?: boolean;
  hasServiceWorker?: boolean;
  hasPushManager?: boolean;
  existingSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    unsubscribe?: () => Promise<boolean>;
  } | null;
  requestPermission?: RequestPermissionFn;
  fetchResponse?: Response;
};

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)" ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
}

function setStandaloneFlag(value: boolean) {
  Object.defineProperty(window.navigator, "standalone", {
    configurable: true,
    value,
  });
}

function setSecureContext(value: boolean) {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value,
  });
}

function setNotificationApi(requestPermission: RequestPermissionFn) {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: {
      permission: "default",
      requestPermission,
    },
  });
}

function setPushEnvironment({
  userAgent = "Mozilla/5.0",
  standalone = false,
  secure = true,
  hasNotification = true,
  hasServiceWorker = true,
  hasPushManager = true,
  existingSubscription = null,
  requestPermission = vi.fn().mockResolvedValue("granted") as unknown as RequestPermissionFn,
  fetchResponse = new Response(JSON.stringify({}), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  }),
}: PushEnvironmentOptions = {}) {
  setUserAgent(userAgent);
  setStandaloneFlag(standalone);
  setMatchMedia(standalone);
  setSecureContext(secure);

  if (hasNotification) {
    setNotificationApi(requestPermission);
  } else {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: undefined,
    });
  }

  if (hasPushManager) {
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class PushManagerMock {},
    });
  } else {
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: undefined,
    });
  }

  const subscribe = vi.fn().mockResolvedValue({
    endpoint: "https://example.push.apple.com/device/123",
    keys: {
      p256dh: "p256dh-key",
      auth: "auth-key",
    },
    unsubscribe: vi.fn().mockResolvedValue(true),
  });
  const getSubscription = vi.fn().mockResolvedValue(existingSubscription);

  if (hasServiceWorker) {
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription,
            subscribe,
          },
        }),
      },
    });
  } else {
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  }

  globalThis.fetch = vi.fn().mockResolvedValue(fetchResponse) as typeof fetch;

  return { subscribe, getSubscription };
}

describe("getPushSupportState", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", TEST_VAPID_KEY);
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects iOS Safari when the app is not opened from the Home Screen", async () => {
    setPushEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      standalone: false,
    });

    const { getPushSupportState } = await import("./push");

    expect(getPushSupportState()).toEqual(
      expect.objectContaining({
        supported: false,
        isIos: true,
        isStandalone: false,
        error:
          "On iPhone, install the app to the Home Screen before enabling notifications",
      }),
    );
  });

  it("accepts iOS Home Screen mode when push prerequisites exist", async () => {
    setPushEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      standalone: true,
    });

    const { getPushSupportState } = await import("./push");

    expect(getPushSupportState()).toEqual(
      expect.objectContaining({
        supported: true,
        isIos: true,
        isStandalone: true,
        error: null,
      }),
    );
  });

  it("rejects insecure contexts", async () => {
    setPushEnvironment({
      secure: false,
    });

    const { getPushSupportState } = await import("./push");

    expect(getPushSupportState()).toEqual(
      expect.objectContaining({
        supported: false,
        error: "Push notifications require a secure HTTPS connection",
      }),
    );
  });
});

describe("subscribeToPush", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", TEST_VAPID_KEY);
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("supports callback-style Notification.requestPermission implementations", async () => {
    const callbackPermissionSpy = vi.fn();
    const callbackPermission: RequestPermissionFn = (
      callback?: NotificationPermissionCallback,
    ) => {
      callbackPermissionSpy(callback);
      callback?.("granted");
      return Promise.resolve("granted");
    };
    const { subscribe } = setPushEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      standalone: true,
      requestPermission: callbackPermission,
    });

    const { subscribeToPush } = await import("./push");

    const subscription = await subscribeToPush();

    expect(callbackPermissionSpy).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscription?.endpoint).toContain("example.push.apple.com");
  });

  it("throws the backend error when subscription sync fails", async () => {
    setPushEnvironment({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      standalone: true,
      fetchResponse: new Response(
        JSON.stringify({ error: "Failed to save subscription" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
    });

    const { subscribeToPush } = await import("./push");

    await expect(subscribeToPush()).rejects.toThrow(
      "Failed to save subscription",
    );
  });
});
