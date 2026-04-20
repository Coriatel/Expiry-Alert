import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import {
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Copy,
  Stethoscope,
} from "lucide-react";
import type { Reagent } from "@/types";
import { NewInStockDot } from "@/components/NewInStockDot";
import { Button } from "@/components/ui/Button";
import {
  getDaysUntilExpiry,
  getExpiryStatus,
  getStatusColor,
  formatDate,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ReagentTableProps {
  reagents: Reagent[];
  onEdit: (reagent: Reagent) => void;
  onDuplicate?: (reagent: Reagent) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onToggleInTreatment?: (id: number, value: boolean) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  className?: string;
}

const columnHelper = createColumnHelper<Reagent>();

export function ReagentTable({
  reagents,
  onEdit,
  onDuplicate,
  onDelete,
  onArchive,
  onToggleInTreatment,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  sorting: externalSorting,
  onSortingChange,
  className,
}: ReagentTableProps) {
  const { t } = useTranslation();

  const defaultSorting: SortingState = [{ id: "expiry_date", desc: false }];
  const sorting = externalSorting ?? defaultSorting;

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => (
          <button onClick={onSelectAll} className="flex items-center">
            {selectedIds.length === reagents.length && reagents.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <button
            onClick={() => onToggleSelect(row.original.id)}
            className="flex items-center"
          >
            {selectedIds.includes(row.original.id) ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ),
        size: 40,
      }),
      columnHelper.accessor("name", {
        header: t("table.name"),
        cell: (info) => (
          <span className="font-medium break-words">
            {info.getValue()}
            {info.row.original.replaced_by != null && (
              <>
                {" "}
                <NewInStockDot />
              </>
            )}
          </span>
        ),
      }),
      columnHelper.accessor("supplier_name", {
        header: t("catalog.supplier"),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("category", {
        header: t("table.category"),
        cell: (info) => {
          const value = info.getValue();
          if (!value) return "-";
          return t(`category.${value}`, { defaultValue: "-" });
        },
      }),
      columnHelper.accessor("expiry_date", {
        header: t("table.expiryDate"),
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.display({
        id: "days_until_expiry",
        header: t("table.daysUntilExpiry"),
        cell: ({ row }) => {
          const days = getDaysUntilExpiry(row.original.expiry_date);
          const status = getExpiryStatus(row.original.expiry_date);
          const inTreatment = row.original.in_treatment === true;

          return (
            <div className="flex items-center gap-1 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-amber-300 bg-amber-100 text-amber-800 whitespace-nowrap">
                  {t("status.inTreatment")}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("lot_number", {
        header: t("table.lotNumber"),
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("manufacturer", {
        header: t("table.manufacturerCol"),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("quantity", {
        header: t("newShipment.quantity"),
        cell: (info) => {
          const val = info.getValue();
          return val != null ? val : "\u2014";
        },
      }),
      columnHelper.accessor("notes", {
        header: t("table.notes"),
        cell: (info) => {
          const notes = info.getValue() || "";
          const description = info.row.original.description || "";
          const titleAttr = [description, notes].filter(Boolean).join(" | ");
          return (
            <div className="max-w-xs line-clamp-2" title={titleAttr || undefined}>
              {notes || "-"}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: t("table.actions"),
        cell: ({ row }) => {
          const isExpired =
            getExpiryStatus(row.original.expiry_date) === "expired";
          const inTreatment = row.original.in_treatment === true;
          return (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(row.original)}
                title={t("actions.edit")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(row.original)}
                  title={t("actions.duplicate")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              {isExpired && onToggleInTreatment && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onToggleInTreatment(row.original.id, !inTreatment)
                  }
                  title={
                    inTreatment
                      ? t("actions.removeInTreatment")
                      : t("actions.inTreatment")
                  }
                >
                  <Stethoscope
                    className={cn(
                      "h-4 w-4",
                      inTreatment ? "text-amber-600" : "",
                    )}
                  />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive(row.original.id)}
                title={t("actions.destroy")}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(row.original.id)}
                title={t("actions.delete")}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          );
        },
        size: 120,
      }),
    ],
    [
      t,
      selectedIds,
      reagents.length,
      onToggleSelect,
      onSelectAll,
      onEdit,
      onDuplicate,
      onArchive,
      onDelete,
      onToggleInTreatment,
    ],
  );

  const table = useReactTable({
    data: reagents,
    columns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange?.(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (reagents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("dashboard.noReagents")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "table-container overflow-auto max-h-[600px] border rounded-lg",
        className,
      )}
    >
      <table className="w-full">
        <thead className="bg-muted sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "px-4 py-3 text-start text-sm font-medium border-b whitespace-nowrap",
                    (header.id === "select" || header.id === "actions") &&
                      "print-hide",
                  )}
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={cn(
                        header.column.getCanSort() &&
                          "cursor-pointer select-none",
                        "flex items-center gap-2",
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() && (
                        <span>
                          {header.column.getIsSorted() === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const status = getExpiryStatus(row.original.expiry_date);
            return (
              <tr
                key={row.id}
                className={cn(
                  "border-b hover:bg-muted/50",
                  status === "expired" && "bg-red-50",
                  status === "expiring-soon" && "bg-orange-50",
                  status === "expiring-week" && "bg-yellow-50",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-4 py-3 text-sm whitespace-nowrap",
                      (cell.column.id === "select" ||
                        cell.column.id === "actions") &&
                        "print-hide",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
