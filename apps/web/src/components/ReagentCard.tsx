import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BellOff,
  CheckSquare,
  ChevronDown,
  Copy,
  Flame,
  Pencil,
  Square,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NewInStockDot } from "@/components/NewInStockDot";
import { getAlertType } from "@/components/ExpiryAlertSection";
import type { Reagent } from "@/types";
import {
  cn,
  formatDate,
  getDaysUntilExpiry,
  getExpiryStatus,
  getStatusColor,
} from "@/lib/utils";

interface ReagentCardProps {
  reagent: Reagent;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit: (reagent: Reagent) => void;
  onDuplicate?: (reagent: Reagent) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onToggleInTreatment?: (id: number, value: boolean) => void;
  onDismissAlert?: (reagent: Reagent) => void;
}

// A thin stripe on the leading edge carries the status; the card itself stays white.
function getStatusStripe(status: string): string {
  switch (status) {
    case "expired":
      return "border-s-red-500";
    case "expiring-soon":
      return "border-s-orange-400";
    case "expiring-week":
      return "border-s-amber-300";
    default:
      return "border-s-emerald-300";
  }
}

function MetaField({
  label,
  value,
  className,
  direction = "auto",
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  direction?: "auto" | "ltr";
}) {
  if (value == null || value === "") return null;
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] leading-[13px] text-muted-foreground">{label}</dt>
      <dd
        className="break-words text-[13px] font-medium leading-[15px] [overflow-wrap:anywhere]"
        dir={direction}
      >
        {value}
      </dd>
    </div>
  );
}

export function ReagentCard({
  reagent,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onArchive,
  onToggleInTreatment,
  onDismissAlert,
}: ReagentCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const days = getDaysUntilExpiry(reagent.expiry_date);
  const status = getExpiryStatus(reagent.expiry_date);
  const isExpired = status === "expired";
  const inTreatment = reagent.in_treatment === true;
  const statusLabel =
    days < 0
      ? t("status.expired")
      : days === 0
        ? t("status.expiresToday")
        : days === 1
          ? t("status.expiresInOneDay")
          : t("status.expiresIn", { days });
  const iconButton = "h-11 w-11 shrink-0 p-0";
  // The server drops only the 3-7 day reminder for good; closer ones come back the next day.
  const dismissLabel =
    getAlertType(days) === "7day"
      ? t("notifications.dismiss")
      : t("notifications.dismissForToday");

  return (
    <article
      className={cn(
        "rounded-lg border border-s-4 bg-card shadow-sm",
        getStatusStripe(status),
      )}
    >
      <div className="flex items-center gap-0.5 py-0.5 pe-0.5">
        <button
          type="button"
          onClick={() => onToggleSelect(reagent.id)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("table.selectItem")}
          aria-pressed={isSelected}
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <div className="min-w-0 flex-1 py-1">
          <h2
            className="break-words text-[15px] font-semibold leading-5 [overflow-wrap:anywhere]"
            dir="auto"
          >
            {reagent.name}
            {reagent.replaced_by != null && (
              <>
                {" "}
                <NewInStockDot />
              </>
            )}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-4">
            <span className="tabular-nums text-muted-foreground" dir="ltr">
              {formatDate(reagent.expiry_date)}
            </span>
            <span
              className={cn(
                "rounded-full border px-1.5 text-[11px] font-medium leading-4",
                getStatusColor(status),
              )}
            >
              {statusLabel}
            </span>
            {inTreatment && (
              <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 text-[11px] font-medium leading-4 text-amber-800">
                {t("status.inTreatment")}
              </span>
            )}
          </div>
        </div>
        {onDuplicate && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDuplicate(reagent)}
            className={iconButton}
            aria-label={t("actions.duplicate")}
            title={t("actions.duplicate")}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => onDelete(reagent.id)}
          className={iconButton}
          aria-label={t("actions.delete")}
          title={t("actions.delete")}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setExpanded((value) => !value)}
          className={iconButton}
          aria-expanded={expanded}
          aria-label={expanded ? t("card.hideDetails") : t("card.showDetails")}
          title={expanded ? t("card.hideDetails") : t("card.showDetails")}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </Button>
      </div>

      {expanded && (
        <div className="border-t px-3 pt-1.5">
          <dl className="grid grid-cols-3 gap-x-2 gap-y-1">
            <MetaField
              label={t("batchHistory.supplier")}
              value={reagent.supplier_name}
            />
            <MetaField
              label={t("form.manufacturer")}
              value={reagent.manufacturer}
            />
            <MetaField label={t("form.lotNumber")} value={reagent.lot_number} />
            <MetaField
              label={t("form.receivedDate")}
              value={reagent.received_date ? formatDate(reagent.received_date) : null}
              direction="ltr"
            />
            <MetaField
              label={t("newShipment.quantity")}
              value={reagent.quantity}
            />
            <MetaField
              label={t("form.category")}
              value={t(`category.${reagent.category}`, { defaultValue: "—" })}
            />
          </dl>

          {reagent.description && (
            <p
              className="mt-1 break-words text-[13px] leading-[15px] text-muted-foreground [overflow-wrap:anywhere]"
              dir="auto"
            >
              {reagent.description}
            </p>
          )}
          {reagent.notes && (
            <p
              className="mt-1 break-words whitespace-pre-wrap text-[13px] leading-[15px] text-muted-foreground [overflow-wrap:anywhere]"
              dir="auto"
            >
              {reagent.notes}
            </p>
          )}

          <div className="mt-0.5 flex items-center justify-end gap-0.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onEdit(reagent)}
              className={iconButton}
              aria-label={t("actions.edit")}
              title={t("actions.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {isExpired && onToggleInTreatment && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onToggleInTreatment(reagent.id, !inTreatment)}
                className={iconButton}
                aria-label={
                  inTreatment
                    ? t("actions.removeInTreatment")
                    : t("actions.inTreatment")
                }
                title={
                  inTreatment
                    ? t("actions.removeInTreatment")
                    : t("actions.inTreatment")
                }
              >
                <Stethoscope
                  className={cn("h-4 w-4", inTreatment && "text-amber-600")}
                />
              </Button>
            )}
            {onDismissAlert && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDismissAlert(reagent)}
                className={iconButton}
                aria-label={dismissLabel}
                title={dismissLabel}
              >
                <BellOff className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onArchive(reagent.id)}
              className={iconButton}
              aria-label={t("actions.destroy")}
              title={t("actions.destroy")}
            >
              <Flame className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
