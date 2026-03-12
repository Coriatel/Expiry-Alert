import { useCallback, useEffect, useState } from "react";
import { getUnreadMessageCount } from "@/lib/tauri";
import { MESSAGES_UPDATED_EVENT } from "@/lib/messageEvents";

export function useUnreadMessageCount(
  enabled: boolean,
  teamId?: number | null,
) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }

    try {
      const next = await getUnreadMessageCount();
      setCount(next);
    } catch (error) {
      console.error("Failed to load unread message count", error);
    }
  }, [enabled, teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    const handleMessagesUpdated = () => {
      void refresh();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener(MESSAGES_UPDATED_EVENT, handleMessagesUpdated);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener(MESSAGES_UPDATED_EVENT, handleMessagesUpdated);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, refresh, teamId]);

  return {
    count,
    refresh,
  };
}
