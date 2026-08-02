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
  Flame,
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
          <button
            type="button"
            onClick={onSelectAll}
            className="flex h-11 w-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("table.selectAll")}
          >
            {selectedIds.length === reagents.length && reagents.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onToggleSelect(row.original.id)}
            className="flex h-11 w-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("table.selectItem", { name: row.original.name })}
          >
            {selectedIds.includes(row.original.id) ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        ),
        size: 64,
      }),
      columnHelper.accessor("name", {
        header: t("table.name"),
        size: 260,
        cell: (info) => (
          <span
            className="block max-w-xs break-words font-medium [overflow-wrap:anywhere]"
            dir="auto"
          >
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
        size: 180,
        cell: (info) => <span dir="auto">{info.getValue() || "\u2014"}</span>,
      }),
      columnHelper.accessor("category", {
        header: t("table.category"),
        size: 120,
        cell: (info) => {
          const value = info.getValue();
          if (!value) return "-";
          return t(`category.${value}`, { defaultValue: "-" });
        },
      }),
      columnHelper.accessor("expiry_date", {
        header: t("table.expiryDate"),
        size: 130,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.display({
        id: "days_until_expiry",
        header: t("table.daysUntilExpiry"),
        size: 170,
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
        size: 190,
        cell: (info) => <span dir="auto">{info.getValue() || "-"}</span>,
      }),
      columnHelper.accessor("manufacturer", {
        header: t("table.manufacturerCol"),
        size: 160,
        cell: (info) => <span dir="auto">{info.getValue() || "\u2014"}</span>,
      }),
      columnHelper.accessor("quantity", {
        header: t("newShipment.quantity"),
        size: 90,
        cell: (info) => {
          const val = info.getValue();
          return val != null ? val : "\u2014";
        },
      }),
      columnHelper.accessor("notes", {
        header: t("table.notes"),
        size: 220,
        cell: (info) => {
          const notes = info.getValue() || "";
          const description = info.row.original.description || "";
          const titleAttr = [description, notes].filter(Boolean).join(" | ");
          return (
            <div
              className="max-w-xs line-clamp-2"
              dir="auto"
              title={titleAttr || undefined}
            >
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
                aria-label={t("actions.edit")}
                className="h-11 w-11 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(row.original)}
                  title={t("actions.duplicate")}
                  aria-label={t("actions.duplicate")}
                  className="h-11 w-11 p-0"
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
                  aria-label={
                    inTreatment
                      ? t("actions.removeInTreatment")
                      : t("actions.inTreatment")
                  }
                  className="h-11 w-11 p-0"
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
                aria-label={t("actions.destroy")}
                className="h-11 w-11 p-0"
              >
                <Flame className="h-4 w-4 text-destructive" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(row.original.id)}
                title={t("actions.delete")}
                aria-label={t("actions.delete")}
                className="h-11 w-11 p-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          );
        },
        size: 260,
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
        "table-container max-h-[600px] max-w-full overflow-auto rounded-lg border",
        className,
      )}
      role="region"
      tabIndex={0}
      aria-label={t("table.regionLabel")}
    >
      <table className="w-full min-w-[1844px] table-fixed">
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
                    header.id === "actions" &&
                      "sticky left-0 z-20 border-e bg-muted",
                  )}
                  style={{
                    width: header.getSize(),
                    minWidth: header.getSize(),
                  }}
                >
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className={cn(
                        header.column.getCanSort() &&
                          "cursor-pointer select-none hover:underline",
                        "flex min-h-11 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      disabled={!header.column.getCanSort()}
                      aria-label={
                        header.column.getCanSort()
                          ? t("filters.changeSortDirection")
                          : undefined
                      }
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
                    </button>
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
                      "px-4 py-3 text-sm",
                      !["name", "supplier_name", "manufacturer", "notes"].includes(
                        cell.column.id,
                      ) && "whitespace-nowrap",
                      (cell.column.id === "select" ||
                        cell.column.id === "actions") &&
                        "print-hide",
                      cell.column.id === "actions" && [
                        "sticky left-0 z-[1] border-e bg-background",
                        status === "expired" && "bg-red-50",
                        status === "expiring-soon" && "bg-orange-50",
                        status === "expiring-week" && "bg-yellow-50",
                      ],
                    )}
                    style={{
                      width: cell.column.getSize(),
                      minWidth: cell.column.getSize(),
                    }}
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
