import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { fetchMe, type AuthUser } from "@/lib/auth";

interface PendingApprovalProps {
  pendingRequest?: AuthUser["pending_join_request"];
  onApproved: (user: AuthUser) => void;
  onPendingCleared: (user: AuthUser | null) => void;
  onSignOut: () => void;
}

export function PendingApproval({
  pendingRequest,
  onApproved,
  onPendingCleared,
  onSignOut,
}: PendingApprovalProps) {
  const { t } = useTranslation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const me = await fetchMe();
        if (!me) {
          onPendingCleared(null);
          return;
        }

        if (me.team_id && me.team_approved !== false) {
          onApproved(me);
          return;
        }

        if (!me.pending_join_request && me.team_approved !== false) {
          onPendingCleared(me);
        }
      } catch {
        // ignore polling errors and try again on the next cycle
      }
    }, 10_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [onApproved, onPendingCleared]);

  const title = pendingRequest
    ? t("teamSelect.pendingApproval")
    : t("teamSelect.pendingTeamApproval");
  const message = pendingRequest
    ? t("teamSelect.pendingMessage", { team: pendingRequest.team_name })
    : t("teamSelect.pendingTeamMessage");

  return (
    <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-sm text-center">
      <div className="mb-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{message}</p>
        {pendingRequest?.requester_message ? (
          <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-start">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              {t("teamSelect.requestMessage")}
            </p>
            <p className="text-sm whitespace-pre-wrap">
              {pendingRequest.requester_message}
            </p>
          </div>
        ) : null}
      </div>
      <Button variant="outline" onClick={onSignOut}>
        {t("auth.signOut")}
      </Button>
    </div>
  );
}
