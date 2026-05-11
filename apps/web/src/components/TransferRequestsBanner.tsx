import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Inbox, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  decideTransferRequest,
  listIncomingTransferRequests,
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
  const [items, setItems] = useState<TransferRequest[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    listIncomingTransferRequests()
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [pollMs]);

  if (items.length === 0) return null;

  const teamName = (id: number) =>
    teams.find((tm) => tm.id === id)?.name ?? `#${id}`;

  const handleDecide = async (
    id: number,
    decision: "approved" | "rejected",
  ) => {
    setBusyId(id);
    try {
      await decideTransferRequest(id, decision);
      setItems((cur) => cur.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 print:hidden">
      <div className="flex items-center gap-2 mb-2">
        <Inbox className="h-4 w-4 text-blue-700" />
        <span className="font-semibold text-blue-900 text-sm">
          {t("transferRequests.bannerTitle", {
            defaultValue: "בקשות העברה נכנסות",
          })}{" "}
          ({items.length})
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((req) => (
          <li
            key={req.id}
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
            <div className="flex gap-2 shrink-0">
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
      </ul>
      <p className="mt-2 text-xs text-blue-800">
        {t("transferRequests.hint", {
          defaultValue:
            "לאחר אישור — בחר/י פריטים בלוח הבקרה ולחץ/י 'העבר לצוות' כדי לשלוח.",
        })}
      </p>
    </div>
  );
}
