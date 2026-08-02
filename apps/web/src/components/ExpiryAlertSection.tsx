import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useStore } from "@/store/store";
import type { Reagent } from "@/types";
import { getDaysUntilExpiry } from "@/lib/utils";

interface ExpiryAlertSectionProps {
  reagents: Reagent[];
  onSnooze: (reagentId: number, days: number) => void;
  onDismiss: (reagentId: number, alertType?: string) => void;
  teamName?: string;
}

function getAlertType(days: number): string {
  if (days >= 7) return "7day";
  if (days === 2) return "2day";
  if (days === 1) return "1day";
  if (days === 0) return "0day";
  return "expired";
}

function getUrgencyIcon(days: number) {
  if (days < 0) return "bg-red-500";
  if (days <= 2) return "bg-orange-500";
  return "bg-yellow-500";
}

function getBorderColor(reagents: Reagent[]): string {
  const hasExpired = reagents.some(
    (r) => getDaysUntilExpiry(r.expiry_date) < 0,
  );
  if (hasExpired) return "border-l-red-500";
  const hasUrgent = reagents.some(
    (r) => getDaysUntilExpiry(r.expiry_date) <= 2,
  );
  if (hasUrgent) return "border-l-orange-500";
  return "border-l-yellow-500";
}

function getBgColor(reagents: Reagent[]): string {
  const hasExpired = reagents.some(
    (r) => getDaysUntilExpiry(r.expiry_date) < 0,
  );
  if (hasExpired) return "bg-red-50";
  const hasUrgent = reagents.some(
    (r) => getDaysUntilExpiry(r.expiry_date) <= 2,
  );
  if (hasUrgent) return "bg-orange-50";
  return "bg-yellow-50";
}

export function ExpiryAlertSection({
  reagents,
  onSnooze,
  onDismiss,
  teamName,
}: ExpiryAlertSectionProps) {
  const { t } = useTranslation();
  const { alertExpanded, setAlertExpanded } = useStore();
  const [pendingDismiss, setPendingDismiss] = useState<
    | { reagentId: number; alertType: string; itemName: string }
    | "all"
    | null
  >(null);

  if (reagents.length === 0) return null;

  // Auto-expand when any item is urgent (expired or ≤2 days away)
  const hasUrgent = reagents.some(
    (r) => getDaysUntilExpiry(r.expiry_date) <= 2,
  );

  const expanded = alertExpanded ?? hasUrgent;

  const sorted = [...reagents].sort(
    (a, b) =>
      getDaysUntilExpiry(a.expiry_date) - getDaysUntilExpiry(b.expiry_date),
  );

  return (
    <div
      className={`print:hidden rounded-lg border border-l-4 ${getBorderColor(reagents)} ${getBgColor(reagents)} shadow-sm`}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setAlertExpanded(!expanded)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <span className="font-semibold text-sm truncate">
            {t("notifications.alertSummary", { count: reagents.length })}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-2 px-3 pb-3">
          {/* Reagent list */}
          <div className="space-y-1.5">
            {sorted.map((reagent) => {
              const days = getDaysUntilExpiry(reagent.expiry_date);
              const alertType = getAlertType(days);
              const indicatorClass = getUrgencyIcon(days);
              return (
                <div
                  key={reagent.id}
                  className="flex items-start justify-between gap-1 rounded-md bg-white/70 py-1.5 ps-2 text-sm"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${indicatorClass}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block break-words font-medium leading-5 [overflow-wrap:anywhere]"
                        dir="auto"
                      >
                        {reagent.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {teamName ? `${teamName} - ` : ""}
                        {days < 0
                          ? t("status.expired")
                          : days === 0
                            ? t("status.expiresToday")
                            : days === 1
                              ? t("status.expiresInOneDay")
                              : t("status.expiresIn", { days })}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDismiss({
                        reagentId: reagent.id,
                        alertType,
                        itemName: reagent.name,
                      })
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={t("notifications.dismiss")}
                    aria-label={t("notifications.dismiss")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Guidance text */}
          <p className="border-t pt-2 text-xs text-muted-foreground">
            {t("notifications.guidance")}
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-1.5 border-t pt-2">
            <Button
              variant="outline"
              onClick={() => reagents.forEach((r) => onSnooze(r.id, 1))}
              className="min-h-11 h-auto px-1.5 py-1 text-xs leading-4"
              aria-label={t("notifications.remindTomorrow")}
            >
              <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.remindTomorrow")}
            </Button>
            <Button
              variant="outline"
              onClick={() => reagents.forEach((r) => onSnooze(r.id, 3))}
              className="min-h-11 h-auto px-1.5 py-1 text-xs leading-4"
              aria-label={t("notifications.remindIn3Days")}
            >
              <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.remindIn3Days")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPendingDismiss("all")}
              className="min-h-11 h-auto px-1.5 py-1 text-xs leading-4"
              aria-label={t("notifications.dismissAll")}
            >
              <X className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.dismissAll")}
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={pendingDismiss !== null}
        onClose={() => setPendingDismiss(null)}
        onConfirm={() => {
          if (pendingDismiss === "all") {
            reagents.forEach((reagent) => {
              const days = getDaysUntilExpiry(reagent.expiry_date);
              onDismiss(reagent.id, getAlertType(days));
            });
          } else if (pendingDismiss) {
            onDismiss(pendingDismiss.reagentId, pendingDismiss.alertType);
          }
        }}
        title={t("notifications.dismissConfirmTitle")}
        message={
          pendingDismiss === "all"
            ? t("notifications.dismissAllConfirm")
            : t("notifications.dismissItemConfirm", {
                item: pendingDismiss?.itemName ?? "",
              })
        }
        variant="warning"
      />
    </div>
  );
}
