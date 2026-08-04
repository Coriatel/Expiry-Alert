import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckSquare,
  Copy,
  Flame,
  Pencil,
  Square,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NewInStockDot } from "@/components/NewInStockDot";
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
}

function getCardBg(status: string): string {
  switch (status) {
    case "expired":
      return "bg-red-50 border-red-200";
    case "expiring-soon":
      return "bg-orange-50 border-orange-200";
    case "expiring-week":
      return "bg-yellow-50 border-yellow-200";
    default:
      return "bg-card border-border";
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
      <dt className="text-[10px] leading-4 text-muted-foreground">{label}</dt>
      <dd
        className="break-words text-[13px] font-medium leading-4 [overflow-wrap:anywhere]"
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
}: ReagentCardProps) {
  const { t } = useTranslation();
  const [descExpanded, setDescExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
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

  return (
    <article
      className={cn(
        "rounded-lg border px-2.5 py-2 shadow-sm",
        getCardBg(status),
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => onToggleSelect(reagent.id)}
          className="-ms-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("table.selectItem")}
          aria-pressed={isSelected}
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 pt-1.5">
          <h2
            className="min-w-0 flex-1 break-words text-lg font-bold leading-6 [overflow-wrap:anywhere]"
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
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
              getStatusColor(status),
            )}
          >
            {statusLabel}
          </span>
          {inTreatment && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              {t("status.inTreatment")}
            </span>
          )}
        </div>
      </div>

      <dl className="mt-1.5 grid grid-cols-3 gap-x-2 gap-y-1.5 border-t pt-1.5">
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
          label={t("form.expiryDate")}
          value={formatDate(reagent.expiry_date)}
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

      {(reagent.description || reagent.notes) && (
        <div className="mt-1.5 space-y-1 border-t pt-1.5 text-[13px] leading-4 text-muted-foreground">
          {reagent.description && (
            <p className="break-words [overflow-wrap:anywhere]" dir="auto">
              {reagent.description.length > 80 && !descExpanded
                ? `${reagent.description.slice(0, 80)}…`
                : reagent.description}
              {reagent.description.length > 80 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((value) => !value)}
                  className="ms-1 min-h-11 rounded px-2 text-xs text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {descExpanded ? t("actions.close") : t("actions.showMore")}
                </button>
              )}
            </p>
          )}
          {reagent.notes && (
            <div>
              <p
                className={cn(
                  "break-words whitespace-pre-wrap [overflow-wrap:anywhere]",
                  !notesExpanded && "line-clamp-2",
                )}
                dir="auto"
              >
                {reagent.notes}
              </p>
              {reagent.notes.length > 100 && (
                <button
                  type="button"
                  onClick={() => setNotesExpanded((value) => !value)}
                  className="min-h-11 rounded px-2 text-xs text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {notesExpanded ? t("actions.close") : t("actions.showMore")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="-mb-1 mt-1 flex flex-wrap items-center justify-end gap-0.5 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onEdit(reagent)}
          className="h-11 w-11 p-0"
          aria-label={t("actions.edit")}
          title={t("actions.edit")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {onDuplicate && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDuplicate(reagent)}
            className="h-11 w-11 p-0"
            aria-label={t("actions.duplicate")}
            title={t("actions.duplicate")}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
        {isExpired && onToggleInTreatment && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onToggleInTreatment(reagent.id, !inTreatment)}
            className="h-11 w-11 p-0"
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
        <Button
          type="button"
          variant="ghost"
          onClick={() => onArchive(reagent.id)}
          className="h-11 w-11 p-0"
          aria-label={t("actions.destroy")}
          title={t("actions.destroy")}
        >
          <Flame className="h-4 w-4 text-destructive" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onDelete(reagent.id)}
          className="h-11 w-11 p-0"
          aria-label={t("actions.delete")}
          title={t("actions.delete")}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </article>
  );
}
