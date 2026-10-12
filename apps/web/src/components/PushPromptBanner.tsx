import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  subscribeToPush,
  ensurePushSubscription,
  getPushSupportState,
  getVapidPublicKey,
  PUSH_ERROR_CODES,
} from "@/services/push";
import { useToast } from "@/components/ui/Toast";

// "Not now" only snoozes: an alert app whose alerts are off must keep saying so.
const SNOOZED_UNTIL_KEY = "push-prompt-snoozed-until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isSnoozed() {
  const until = Number(localStorage.getItem(SNOOZED_UNTIL_KEY));
  return Number.isFinite(until) && until > Date.now();
}

export function PushPromptBanner() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supportState = getPushSupportState();
      if (!supportState.supported) {
        if (supportState.reason === "ios-home-screen" && !isSnoozed()) {
          setIsIosNotStandalone(true);
          setVisible(true);
        }
        return;
      }

      // Don't show if permission denied
      if (Notification.permission === "denied") return;

      // Already allowed on this device: repair the subscription silently.
      try {
        const result = await ensurePushSubscription();
        if (result !== "needs-permission") return;
      } catch (err) {
        console.error("Push subscription repair failed", err);
      }

      // Don't offer a button that cannot work: no key configured anywhere.
      const publicKey = await getVapidPublicKey();
      if (!publicKey) return;

      if (isSnoozed()) return;
      setVisible(true);
    })();
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      await subscribeToPush();
      setVisible(false);
      showToast(t("settings.notificationsEnabled"), "success");
    } catch (err) {
      console.error("Push subscription failed", err);
      const message = err instanceof Error ? err.message : "";
      const text =
        message === PUSH_ERROR_CODES.notConfigured
          ? t("push.notConfigured")
          : message === PUSH_ERROR_CODES.unsupported
            ? t("push.unsupported")
            : message === PUSH_ERROR_CODES.iosHomeScreenRequired
              ? t("push.iosGuidance")
              : message.includes("denied") ||
                  (typeof Notification !== "undefined" &&
                    Notification.permission === "denied")
                ? t("push.deniedHelp")
                : t("push.enableFailed");
      setError(text);
      showToast(text, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(SNOOZED_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
    setVisible(false);
  };

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="shrink-0 rounded-full bg-primary/10 p-2">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm">{t("push.promptTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("push.promptMessage")}</p>
        {isIosNotStandalone && (
          <p className="text-xs text-muted-foreground mt-1">{t("push.iosGuidance")}</p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDismiss}
          className="min-h-11"
        >
          {t("push.notNow")}
        </Button>
        {!isIosNotStandalone && (
          <Button onClick={handleEnable} disabled={loading} className="min-h-11">
            {t("push.enable")}
          </Button>
        )}
      </div>
    </div>
  );
}
