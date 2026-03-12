import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  getTeamJoinRequests,
  reviewTeamJoinRequest,
  type TeamJoinRequest,
} from "@/lib/tauri";

interface TeamJoinRequestsPanelProps {
  teamId: number;
}

export function TeamJoinRequestsPanel({
  teamId,
}: TeamJoinRequestsPanelProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<TeamJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const nextRequests = await getTeamJoinRequests(teamId);
      setRequests(nextRequests);
    } catch (error) {
      console.error(error);
      showToast(t("teamManagement.joinRequestsLoadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t, teamId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function handleReview(
    requestId: number,
    action: "approve" | "reject",
  ) {
    setBusyRequestId(requestId);
    try {
      const status = await reviewTeamJoinRequest(teamId, requestId, action);
      showToast(
        status === "approved"
          ? t("teamManagement.requestApproved")
          : t("teamManagement.requestRejected"),
        "success",
      );
      await loadRequests();
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error
          ? error.message
          : t("teamManagement.requestReviewFailed"),
        "error",
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          {t("teamManagement.joinRequests")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("teamManagement.joinRequestsDescription")}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("actions.processing")}</p>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          {t("teamManagement.noJoinRequests")}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border p-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{request.requester_name}</p>
                <p className="text-sm text-muted-foreground">
                  {request.requester_email}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("teamManagement.requestedAt", {
                    date: request.created_at
                      ? new Date(request.created_at).toLocaleString()
                      : "—",
                  })}
                </p>
                {request.message ? (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                    {request.message}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  disabled={busyRequestId === request.id}
                  onClick={() => void handleReview(request.id, "approve")}
                >
                  {t("teamManagement.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyRequestId === request.id}
                  onClick={() => void handleReview(request.id, "reject")}
                >
                  {t("teamManagement.reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
