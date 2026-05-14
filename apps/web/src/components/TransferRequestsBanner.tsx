import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Inbox, Check, X, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  decideTransferRequest,
  listIncomingTransferRequests,
  listOutgoingTransferRequests,
  type TransferRequest,
} from "@/lib/tauri";
import type { TeamSummary } from "@/lib/tauri";

interface TransferRequestsBannerProps {
  teams: TeamSummary[];
  pollMs?: number;
}

export function TransferRequestsBanner({
  teams,
  pollMs = 30000,
}: TransferRequestsBannerProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [incoming, setIncoming] = useState<TransferRequest[]>([]);
  const [outgoing, setOutgoing] = useState<TransferRequest[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    listIncomingTransferRequests().then(setIncoming).catch(() => setIncoming([]));
    listOutgoingTransferRequests()
      .then((rows) => setOutgoing(rows.filter((r) => r.status === "approved")))
      .catch(() => setOutgoing([]));
  };

  useEffect(() => {
    load();
    const h = setInterval(load, pollMs);
    return () => clearInterval(h);
  }, [pollMs]);

  if (incoming.length === 0 && outgoing.length === 0) return null;

  const teamName = (id: number) =>
    teams.find((tm) => tm.id === id)?.name ?? `#${id}`;

  const handleDecide = async (
    id: number,
    decision: "approved" | "rejected",
  ) => {
    setBusyId(id);
    try {
      await decideTransferRequest(id, decision);
      setIncoming((cur) => cur.filter((r) => r.id !== id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(msg, "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 print:hidden">
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <Inbox className="h-4 w-4 shrink-0 text-blue-700" />
        <span className="font-semibold text-blue-900 text-sm truncate">
          {t("transferRequests.bannerTitle", {
            defaultValue: "בקשות העברה",
          })}{" "}
          ({incoming.length + outgoing.length})
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {incoming.map((req) => (
          <li
            key={`in-${req.id}`}
            className="flex flex-col gap-1 rounded bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1 min-w-0">
              <div>
                <span className="font-medium">{teamName(req.from_team)}</span>{" "}
                <span className="text-muted-foreground">
                  {t("transferRequests.requestsFromYou", {
                    defaultValue: "מבקש/ת ממך פריטים",
                  })}
                </span>
              </div>
              {req.message_text && (
                <div className="text-xs text-muted-foreground truncate">
                  "{req.message_text}"
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecide(req.id, "approved")}
                disabled={busyId === req.id}
              >
                <Check className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {t("transferRequests.approve", { defaultValue: "אישור" })}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecide(req.id, "rejected")}
                disabled={busyId === req.id}
              >
                <X className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {t("transferRequests.reject", { defaultValue: "דחייה" })}
              </Button>
            </div>
          </li>
        ))}
        {outgoing.map((req) => (
          <li
            key={`out-${req.id}`}
            className="flex flex-col gap-1 rounded bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium">{teamName(req.to_team)}</span>{" "}
              <span className="text-muted-foreground">
                {t("transferRequests.approvedYourRequest", {
                  defaultValue: "אישר/ה — מוכן לייבוא",
                })}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href={`/transfer-requests/${req.id}/import`}
                className="inline-flex items-center justify-center h-8 px-3 rounded border bg-white text-sm hover:bg-muted"
              >
                <PackageOpen className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {t("transferRequests.importButton", {
                  defaultValue: "ייבא פריטים",
                })}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
