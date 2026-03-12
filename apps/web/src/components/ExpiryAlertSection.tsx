import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store/store";
import type { Reagent } from "@/types";
import { getDaysUntilExpiry } from "@/lib/utils";

interface ExpiryAlertSectionProps {
  reagents: Reagent[];
  onSnooze: (reagentId: number, days: number) => void;
  onDismiss: (reagentId: number, alertType?: string) => void;
}

function getAlertType(days: number): string {
  if (days >= 7) return "7day";
  if (days === 2) return "2day";
  if (days === 1) return "1day";
  if (days === 0) return "0day";
  return "expired";
}

function getUrgencyIcon(days: number) {
  if (days < 0) return "🔴";
  if (days <= 2) return "🟠";
  return "🟡";
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
}: ExpiryAlertSectionProps) {
  const { t } = useTranslation();
  const { alertExpanded, setAlertExpanded } = useStore();

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
        className="w-full flex items-center justify-between px-4 py-3 text-start"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <span className="font-semibold text-sm">
            {t("notifications.alertSummary", { count: reagents.length })}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Reagent list */}
          <div className="space-y-2">
            {sorted.map((reagent) => {
              const days = getDaysUntilExpiry(reagent.expiry_date);
              const alertType = getAlertType(days);
              const icon = getUrgencyIcon(days);
              return (
                <div
                  key={reagent.id}
                  className="flex items-center justify-between bg-white/70 rounded-md px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span>{icon}</span>
                    <span className="font-medium truncate">{reagent.name}</span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      —{" "}
                      {days < 0
                        ? t("status.expired")
                        : days === 0
                          ? t("status.expiresToday")
                          : days === 1
                            ? t("status.expiresInOneDay")
                            : t("status.expiresIn", { days })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss(reagent.id, alertType)}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground p-1 rounded hover:bg-black/5"
                    title={t("notifications.dismiss")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Guidance text */}
          <p className="text-xs text-muted-foreground border-t pt-2">
            {t("notifications.guidance")}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 border-t pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => reagents.forEach((r) => onSnooze(r.id, 1))}
            >
              <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.remindTomorrow")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reagents.forEach((r) => onSnooze(r.id, 3))}
            >
              <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.remindIn3Days")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reagents.forEach((r) => {
                  const days = getDaysUntilExpiry(r.expiry_date);
                  const alertType = getAlertType(days);
                  onDismiss(r.id, alertType);
                });
              }}
            >
              <X className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.dismissAll")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
