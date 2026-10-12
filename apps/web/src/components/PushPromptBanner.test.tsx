import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushPromptBanner } from "./PushPromptBanner";

const push = vi.hoisted(() => ({
  ensurePushSubscription: vi.fn(),
  subscribeToPush: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock("@/services/push", () => ({
  ...push,
  getPushSupportState: () => ({ supported: true, isIos: false, isStandalone: false, error: null }),
  getVapidPublicKey: async () => "key",
  PUSH_ERROR_CODES: {},
}));

function setPermission(permission: NotificationPermission) {
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission },
  });
}

describe("PushPromptBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    push.ensurePushSubscription.mockReset();
    push.subscribeToPush.mockReset();
  });

  it("comes back for a device that enabled alerts in the past and lost them", async () => {
    // The flag older builds wrote on "enable"; it used to hide the banner forever.
    localStorage.setItem("push-prompt-dismissed", "1");
    setPermission("default");
    push.ensurePushSubscription.mockResolvedValue("needs-permission");

    render(<PushPromptBanner />);

    expect(await screen.findByText("push.promptTitle")).toBeInTheDocument();
  });

  it("stays hidden when the subscription was repaired silently", async () => {
    setPermission("granted");
    push.ensurePushSubscription.mockResolvedValue("subscribed");

    render(<PushPromptBanner />);

    await waitFor(() => expect(push.ensurePushSubscription).toHaveBeenCalled());
    expect(screen.queryByText("push.promptTitle")).not.toBeInTheDocument();
  });

  it("'not now' only snoozes for a week", async () => {
    setPermission("default");
    push.ensurePushSubscription.mockResolvedValue("needs-permission");

    const first = render(<PushPromptBanner />);
    fireEvent.click(await screen.findByText("push.notNow"));
    first.unmount();

    render(<PushPromptBanner />);
    await waitFor(() => expect(push.ensurePushSubscription).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("push.promptTitle")).not.toBeInTheDocument();

    const until = Number(localStorage.getItem("push-prompt-snoozed-until"));
    const days = (until - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });
});
