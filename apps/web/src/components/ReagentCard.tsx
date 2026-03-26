import { useTranslation } from "react-i18next";
import {
  Pencil,
  Trash2,
  Archive,
  CheckSquare,
  Square,
  Copy,
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
}: ReagentCardProps) {
  const { t } = useTranslation();
  const days = getDaysUntilExpiry(reagent.expiry_date);
  const status = getExpiryStatus(reagent.expiry_date);

  return (
    <div className={cn("rounded-lg border p-4 shadow-sm", getCardBg(status))}>
      {/* Top row: checkbox + name */}
      <div className="flex items-start gap-3">
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
          <h3 className="text-lg font-bold break-words">
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
          </div>
        </div>
      </div>

      {/* Lot number + notes */}
      {(reagent.lot_number || reagent.notes) && (
        <div className="mt-2 text-sm text-muted-foreground space-y-1">
          {reagent.lot_number && <p>{reagent.lot_number}</p>}
          {reagent.notes && <p className="break-words">{reagent.notes}</p>}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onArchive(reagent.id)}
          title={t("actions.archive")}
        >
          <Archive className="h-4 w-4 sm:ltr:mr-1 sm:rtl:ml-1" />
          <span className="hidden sm:inline">{t("actions.archive")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(reagent.id)}
          title={t("actions.delete")}
        >
          <Trash2 className="h-4 w-4 text-destructive sm:ltr:mr-1 sm:rtl:ml-1" />
          <span className="hidden sm:inline">{t("actions.delete")}</span>
        </Button>
      </div>
    </div>
  );
}
