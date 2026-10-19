import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
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

// Severity shows in the frame and the icon only; the surface stays plain like the rest of the app.
function getSeverity(reagents: Reagent[]): { frame: string; icon: string } {
  const days = reagents.map((r) => getDaysUntilExpiry(r.expiry_date));
  if (days.some((d) => d < 0)) return { frame: "border-red-400", icon: "text-red-600" };
  if (days.some((d) => d <= 2)) return { frame: "border-orange-400", icon: "text-orange-600" };
  return { frame: "border-yellow-400", icon: "text-yellow-600" };
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
  const severity = getSeverity(reagents);
  // The tap area stays 44px; only the small chip inside it is drawn.
  const actionClass = "group inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const chipClass = "rounded-md border border-input bg-background px-3 py-1 text-xs group-hover:bg-muted";

  return (
    <div
      className={`print:hidden rounded-lg border-2 bg-card ${severity.frame}`}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setAlertExpanded(!expanded)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${severity.icon}`} />
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
          <div className="flex flex-wrap items-center gap-x-1 border-t pt-1">
            <span className="text-xs text-muted-foreground">
              {t("notifications.remindMe")}
            </span>
            <button
              type="button"
              onClick={() => onSnoozeAll(reagents.map((r) => r.id), 1)}
              className={actionClass}
              aria-label={t("notifications.remindTomorrow")}
            >
              <span className={chipClass}>{t("notifications.tomorrowShort")}</span>
            </button>
            <button
              type="button"
              onClick={() => onSnoozeAll(reagents.map((r) => r.id), 3)}
              className={actionClass}
              aria-label={t("notifications.remindIn3Days")}
            >
              <span className={chipClass}>{t("notifications.in3DaysShort")}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDismissAll(true)}
              className={`${actionClass} ms-auto px-1 text-muted-foreground hover:text-foreground`}
              aria-label={t("notifications.dismissAll")}
            >
              <X className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {t("notifications.dismissAll")}
            </button>
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
