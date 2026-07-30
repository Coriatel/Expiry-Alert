import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Copy,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NewInStockDot } from "@/components/NewInStockDot";
import type { Reagent } from "@/types";
import {
  getDaysUntilExpiry,
  getExpiryStatus,
  getStatusColor,
  formatDate,
  cn,
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

  return (
    <div className={cn("rounded-lg border p-3 sm:p-4 shadow-sm", getCardBg(status))}>
      {/* Top row: checkbox + name */}
      <div className="flex items-start gap-2 sm:gap-3">
        <button
          onClick={() => onToggleSelect(reagent.id)}
          className="flex-shrink-0 mt-0.5"
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold break-words leading-snug">
            {reagent.name}
            {reagent.replaced_by != null && (
              <>
                {" "}
                <NewInStockDot />
              </>
            )}
          </h3>
          {/* Subtitle + status badge — single row */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              {reagent.category
                ? t(`category.${reagent.category}`, { defaultValue: "-" })
                : "-"}
              {" • "}
              {formatDate(reagent.expiry_date)}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                getStatusColor(status),
              )}
            >
              {days < 0
                ? t("status.expired")
                : days === 0
                  ? t("status.expiresToday")
                  : days === 1
                    ? t("status.expiresInOneDay")
                    : t("status.expiresIn", { days })}
            </span>
            {inTreatment && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-amber-300 bg-amber-100 text-amber-800">
                {t("status.inTreatment")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Supplier, manufacturer, quantity, lot number, description + notes */}
      {(reagent.supplier_name || reagent.manufacturer || reagent.quantity != null || reagent.lot_number || reagent.notes || reagent.description) && (
        <div className="mt-1.5 text-sm text-muted-foreground space-y-1">
          {/* Compact meta: wraps inline instead of one line per field */}
          {(reagent.supplier_name ||
            reagent.manufacturer ||
            reagent.quantity != null ||
            reagent.lot_number) && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {reagent.supplier_name && <span>{reagent.supplier_name}</span>}
              {reagent.manufacturer && (
                <>
                  {reagent.supplier_name && <span aria-hidden>·</span>}
                  <span className="text-muted-foreground/70">
                    {reagent.manufacturer}
                  </span>
                </>
              )}
              {reagent.quantity != null && (
                <>
                  {(reagent.supplier_name || reagent.manufacturer) && (
                    <span aria-hidden>·</span>
                  )}
                  <span>
                    {t("newShipment.quantity")}: {reagent.quantity}
                  </span>
                </>
              )}
              {reagent.lot_number && (
                <>
                  {(reagent.supplier_name ||
                    reagent.manufacturer ||
                    reagent.quantity != null) && <span aria-hidden>·</span>}
                  <span>{reagent.lot_number}</span>
                </>
              )}
            </div>
          )}
          {reagent.description && (
            <p className="break-words">
              {reagent.description.length > 60 && !descExpanded
                ? reagent.description.slice(0, 60) + "…"
                : reagent.description}
              {reagent.description.length > 60 && (
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="ms-1 text-primary underline text-xs"
                >
                  {descExpanded ? t("actions.close") : "הצג עוד"}
                </button>
              )}
            </p>
          )}
          {reagent.notes && (
            <div>
              <p
                className={cn(
                  "break-words whitespace-pre-wrap",
                  !notesExpanded && "line-clamp-2",
                )}
              >
                {reagent.notes}
              </p>
              {reagent.notes.length > 80 && (
                <button
                  onClick={() => setNotesExpanded((v) => !v)}
                  className="text-primary underline text-xs"
                >
                  {notesExpanded ? t("actions.close") : t("actions.showMore", { defaultValue: "Show more" })}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 pt-2 border-t flex flex-wrap gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(reagent)}
          title={t("actions.edit")}
        >
          <Pencil className="h-4 w-4 sm:ltr:mr-1 sm:rtl:ml-1" />
          <span className="hidden sm:inline">{t("actions.edit")}</span>
        </Button>
        {onDuplicate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(reagent)}
            title={t("actions.duplicate")}
          >
            <Copy className="h-4 w-4 sm:ltr:mr-1 sm:rtl:ml-1" />
            <span className="hidden sm:inline">{t("actions.duplicate")}</span>
          </Button>
        )}
        {isExpired && onToggleInTreatment && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleInTreatment(reagent.id, !inTreatment)}
            title={
              inTreatment
                ? t("actions.removeInTreatment")
                : t("actions.inTreatment")
            }
          >
            <Stethoscope
              className={cn(
                "h-4 w-4 sm:ltr:mr-1 sm:rtl:ml-1",
                inTreatment ? "text-amber-600" : "",
              )}
            />
            <span className="hidden sm:inline">
              {inTreatment
                ? t("actions.removeInTreatment")
                : t("actions.inTreatment")}
            </span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onArchive(reagent.id)}
          title={t("actions.destroy")}
        >
          <Trash2 className="h-4 w-4 text-destructive sm:ltr:mr-1 sm:rtl:ml-1" />
          <span className="hidden sm:inline">{t("actions.destroy")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(reagent.id)}
          title={t("actions.delete")}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground sm:ltr:mr-1 sm:rtl:ml-1" />
          <span className="hidden sm:inline">{t("actions.delete")}</span>
        </Button>
      </div>
    </div>
  );
}
