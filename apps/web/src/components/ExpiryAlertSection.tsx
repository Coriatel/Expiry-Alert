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
  onSnoozeAll: (reagentIds: number[], days: number) => void;
  onDismiss: (reagentId: number, alertType?: string) => void;
  teamName?: string;
}

export function getAlertType(days: number): string {
  // 3-6 days used to fall through to "expired", which the server treats as a
  // recurring alert — dismissing such an item brought the alert back the next day.
  if (days < 0) return "expired";
  if (days === 0) return "0day";
  if (days === 1) return "1day";
  if (days === 2) return "2day";
  return "7day";
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
  onSnoozeAll,
  onDismiss,
  teamName,
}: ExpiryAlertSectionProps) {
  const { t } = useTranslation();
  const { alertExpanded, setAlertExpanded } = useStore();
  const [confirmDismissAll, setConfirmDismissAll] = useState(false);

  if (reagents.length === 0) return null;

  // The items themselves are in the list below. This bar only
  // counts them and offers the reminder actions, so it stays one line until opened.
  const expanded = alertExpanded ?? false;

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
          <span className="min-w-0 truncate text-sm font-semibold">
            {t("notifications.alertSummary", { count: reagents.length })}
            {teamName ? (
              <span className="font-normal text-muted-foreground">
                {" · "}
                {teamName}
              </span>
            ) : null}
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
          {/* Guidance text */}
          <p className="text-xs text-muted-foreground">
            {t("notifications.guidance")}
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-1.5 border-t pt-2">
            <Button
              variant="outline"
              onClick={() => onSnoozeAll(reagents.map((r) => r.id), 1)}
              className="min-h-11 h-auto px-1.5 py-1 text-xs leading-4"
              aria-label={t("notifications.remindTomorrow")}
            >
              <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.remindTomorrow")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onSnoozeAll(reagents.map((r) => r.id), 3)}
              className="min-h-11 h-auto px-1.5 py-1 text-xs leading-4"
              aria-label={t("notifications.remindIn3Days")}
            >
              <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.remindIn3Days")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDismissAll(true)}
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
        open={confirmDismissAll}
        onClose={() => setConfirmDismissAll(false)}
        onConfirm={() => {
          reagents.forEach((reagent) => {
            const days = getDaysUntilExpiry(reagent.expiry_date);
            onDismiss(reagent.id, getAlertType(days));
          });
        }}
        title={t("notifications.dismissConfirmTitle")}
        message={t("notifications.dismissAllConfirm")}
        variant="warning"
      />
    </div>
  );
}
