import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type {
  DestructionLogEntry,
  DuplicationLogEntry,
} from "@/lib/tauri";

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(
    new Date(iso),
  );
}

function Field({
  label,
  value,
  direction = "auto",
}: {
  label: string;
  value: string | number | null | undefined;
  direction?: "auto" | "ltr";
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd
        className="mt-0.5 break-words text-sm leading-5 [overflow-wrap:anywhere]"
        dir={direction}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function CardActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        onClick={onEdit}
        className="h-11 w-11 p-0"
        aria-label={t("actions.edit")}
        title={t("actions.edit")}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onDelete}
        className="h-11 w-11 p-0"
        aria-label={t("actions.delete")}
        title={t("actions.delete")}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

interface DestructionHistoryCardsProps {
  entries: DestructionLogEntry[];
  onEdit: (entry: DestructionLogEntry) => void;
  onDelete: (entry: DestructionLogEntry) => void;
}

export function DestructionHistoryCards({
  entries,
  onEdit,
  onDelete,
}: DestructionHistoryCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {entries.map((entry) => (
        <article
          key={entry.id}
          data-testid="history-card"
          className="rounded-lg border bg-card p-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2 border-b pb-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {formatDateTime(entry.destruction_date)}
              </p>
              <h2
                className="mt-1 break-words text-base font-semibold leading-5 [overflow-wrap:anywhere]"
                dir="auto"
              >
                {entry.reagent_name}
              </h2>
            </div>
            <CardActions
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry)}
            />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            <Field label={t("batchHistory.supplier")} value={entry.supplier_name} />
            <Field label={t("batchHistory.lotNumber")} value={entry.lot_number} />
            <Field
              label={t("batchHistory.expiryDate")}
              value={formatDate(entry.expiry_date)}
              direction="ltr"
            />
            <Field
              label={t("batchHistory.performedBy")}
              value={entry.destroyed_by_name}
            />
            <Field
              label={t("batchHistory.quantityOriginal")}
              value={entry.quantity_original}
            />
            <Field
              label={t("batchHistory.quantityDestroyed")}
              value={entry.quantity_destroyed}
            />
            {entry.notes && (
              <div className="col-span-2">
                <Field label={t("batchHistory.notes")} value={entry.notes} />
              </div>
            )}
          </dl>
        </article>
      ))}
    </div>
  );
}

interface DuplicationHistoryCardsProps {
  entries: DuplicationLogEntry[];
  onEdit: (entry: DuplicationLogEntry) => void;
  onDelete: (entry: DuplicationLogEntry) => void;
}

export function DuplicationHistoryCards({
  entries,
  onEdit,
  onDelete,
}: DuplicationHistoryCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {entries.map((entry) => (
        <article
          key={entry.id}
          data-testid="history-card"
          className="rounded-lg border bg-card p-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2 border-b pb-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {formatDateTime(entry.received_date)}
              </p>
              <h2
                className="mt-1 break-words text-base font-semibold leading-5 [overflow-wrap:anywhere]"
                dir="auto"
              >
                {entry.reagent_name}
              </h2>
            </div>
            <CardActions
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry)}
            />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            <Field
              label={t("duplicationHistory.supplier")}
              value={entry.supplier_name}
            />
            <Field
              label={t("duplicationHistory.lotNumber")}
              value={entry.lot_number}
            />
            <Field
              label={t("duplicationHistory.expiryDate")}
              value={formatDate(entry.expiry_date)}
              direction="ltr"
            />
            <Field
              label={t("duplicationHistory.performedBy")}
              value={entry.received_by_name}
            />
            <Field
              label={t("duplicationHistory.quantity")}
              value={entry.quantity}
            />
          </dl>
        </article>
      ))}
    </div>
  );
}
