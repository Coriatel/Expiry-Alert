import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  subscribeToPush,
  checkPushSubscription,
  getPushSupportState,
} from "@/services/push";

const DISMISSED_KEY = "push-prompt-dismissed";

export function PushPromptBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false);

  useEffect(() => {
    (async () => {
      // Don't show if dismissed
      if (localStorage.getItem(DISMISSED_KEY)) return;

      const supportState = getPushSupportState();
      if (!supportState.supported) {
        if (supportState.reason === "ios-home-screen") {
          setIsIosNotStandalone(true);
          setVisible(true);
        }
        return;
      }

      // Don't show if permission denied
      if (Notification.permission === "denied") return;

      // Don't show if already subscribed
      try {
        const sub = await checkPushSubscription();
        if (sub) return;
      } catch {
        return;
      }

      setVisible(true);
    })();
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setLoading(true);
    try {
      await subscribeToPush();
      setVisible(false);
    } catch (err) {
      console.error("Push subscription failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
      <div className="rounded-full bg-primary/10 p-2 shrink-0">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{t("push.promptTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("push.promptMessage")}</p>
        {isIosNotStandalone && (
          <p className="text-xs text-muted-foreground mt-1">{t("push.iosGuidance")}</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={handleDismiss}>
          {t("push.notNow")}
        </Button>
        {!isIosNotStandalone && (
          <Button size="sm" onClick={handleEnable} disabled={loading}>
            {t("push.enable")}
          </Button>
        )}
      </div>
    </div>
  );
}
