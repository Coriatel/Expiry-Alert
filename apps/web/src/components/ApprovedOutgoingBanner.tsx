import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PackageOpen, ArrowLeftCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  listOutgoingTransferRequests,
  type TransferRequest,
} from "@/lib/tauri";
import type { TeamSummary } from "@/lib/tauri";

interface ApprovedOutgoingBannerProps {
  teams: TeamSummary[];
  pollMs?: number;
}

export function ApprovedOutgoingBanner({
  teams,
  pollMs = 30000,
}: ApprovedOutgoingBannerProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TransferRequest[]>([]);

  const load = () => {
    listOutgoingTransferRequests()
      .then((rows) => setItems(rows.filter((r) => r.status === "approved")))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
    const h = setInterval(load, pollMs);
    return () => clearInterval(h);
  }, [pollMs]);

  if (items.length === 0) return null;

  const teamName = (id: number) =>
    teams.find((tm) => tm.id === id)?.name ?? `#${id}`;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 print:hidden">
      <div className="flex items-center gap-2 mb-2">
        <PackageOpen className="h-4 w-4 text-emerald-700" />
        <span className="font-semibold text-emerald-900 text-sm">
          {t("approvedOutgoing.bannerTitle", {
            defaultValue: "בקשות מאושרות — מוכנות לייבוא",
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
                <span className="font-medium">{teamName(req.to_team)}</span>{" "}
                <span className="text-muted-foreground">
                  {t("approvedOutgoing.approvedYourRequest", {
                    defaultValue: "אישר/ה את הבקשה שלך",
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
                onClick={() => {
                  window.location.href = `/transfer-requests/${req.id}/import`;
                }}
              >
                <ArrowLeftCircle className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {t("approvedOutgoing.importButton", {
                  defaultValue: "ייבא פריטים",
                })}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-emerald-800">
        {t("approvedOutgoing.hint", {
          defaultValue:
            "לחץ/י 'ייבא פריטים' כדי לבחור אילו פריטים להעביר לקטלוג שלך. הבקשה תועבר למצב 'הושלם' אחרי ייבוא ראשון.",
        })}
      </p>
    </div>
  );
}
