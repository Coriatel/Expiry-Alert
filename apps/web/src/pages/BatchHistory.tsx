import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PrintHeader } from "@/components/PrintHeader";
import {
  deleteDestructionEntry,
  getDestructionLog,
  updateDestructionEntry,
} from "@/lib/tauri";
import { EditLogLineDialog, type LogField } from "@/components/EditLogLineDialog";
import { DeleteLogLineDialog } from "@/components/DeleteLogLineDialog";
import { Pencil, Trash2 } from "lucide-react";
import { HistoryViewToggle } from "@/components/HistoryViewToggle";
import { DestructionHistoryCards } from "@/components/HistoryCards";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useStore } from "@/store/store";
import { cn } from "@/lib/utils";
import { getDestructionDisplayEntries } from "@/lib/historyDisplay";
import type { DestructionLogEntry } from "@/lib/tauri";

interface BatchHistoryProps {
  teamName: string;
  userName: string;
}

type PeriodKey =
  | "lastMonth"
  | "previousMonth"
  | "last3Months"
  | "lastHalfYear"
  | "lastYear"
  | "custom";

type SortField = keyof DestructionLogEntry;
type SortDir = "asc" | "desc";

function getPeriodDates(key: Exclude<PeriodKey, "custom">): {
  from: string;
  to: string;
} {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from: Date;

  switch (key) {
    case "lastMonth": {
      from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      break;
    }
    case "previousMonth": {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const toDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: from.toISOString().slice(0, 10),
        to: toDate.toISOString().slice(0, 10),
      };
    }
    case "last3Months": {
      from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      break;
    }
    case "lastHalfYear": {
      from = new Date(now);
      from.setMonth(from.getMonth() - 6);
      break;
    }
    case "lastYear": {
      from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      break;
    }
  }

  return { from: from.toISOString().slice(0, 10), to };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function BatchHistory({ teamName, userName }: BatchHistoryProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { batchHistoryViewMode, setBatchHistoryViewMode } = useStore();
  const effectiveViewMode =
    batchHistoryViewMode ?? (isMobile ? "cards" : "table");

  // Period selection
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("lastMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Data
  const [entries, setEntries] = useState<DestructionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editEntry, setEditEntry] = useState<DestructionLogEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<DestructionLogEntry | null>(null);

  // Filters
  const [destroyedOnly, setDestroyedOnly] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("destruction_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const loadData = useCallback(
    async (from?: string, to?: string) => {
      setIsLoading(true);
      try {
        const data = await getDestructionLog(from, to);
        setEntries(data);
      } catch (error) {
        console.error("Failed to load destruction log:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Load data when period changes
  useEffect(() => {
    if (activePeriod === "custom") return;
    const { from, to } = getPeriodDates(activePeriod);
    loadData(from, to);
  }, [activePeriod, loadData]);

  const reload = () => {
    if (activePeriod === "custom") {
      loadData(customFrom || undefined, customTo || undefined);
      return;
    }
    const { from, to } = getPeriodDates(activePeriod);
    loadData(from, to);
  };

  const editFields: LogField[] = [
    { key: "reagent_name", label: t("batchHistory.reagentName"), type: "text" },
    { key: "supplier_name", label: t("batchHistory.supplier"), type: "text" },
    { key: "lot_number", label: t("batchHistory.lotNumber"), type: "text" },
    { key: "expiry_date", label: t("batchHistory.expiryDate"), type: "date" },
    { key: "quantity_original", label: t("batchHistory.quantityOriginal"), type: "number" },
    { key: "quantity_destroyed", label: t("batchHistory.quantityDestroyed"), type: "number" },
    { key: "notes", label: t("batchHistory.notes", { defaultValue: "Notes" }), type: "textarea" },
  ];

  const handleSaveEdit = async (id: number, data: Record<string, unknown>) => {
    await updateDestructionEntry(id, data as any);
    reload();
  };

  const handleConfirmDelete = async (restore: boolean) => {
    if (!deleteEntry) return;
    await deleteDestructionEntry(deleteEntry.id, restore);
    reload();
  };

  const handleCustomSearch = () => {
    setActivePeriod("custom");
    loadData(customFrom || undefined, customTo || undefined);
  };

  const handlePeriodClick = (key: Exclude<PeriodKey, "custom">) => {
    setActivePeriod(key);
  };

  // Filter and sort
  const displayEntries = useMemo(
    () =>
      getDestructionDisplayEntries(
        entries,
        destroyedOnly,
        sortField,
        sortDir,
      ),
    [entries, destroyedOnly, sortField, sortDir],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const periodButtons: { key: Exclude<PeriodKey, "custom">; label: string }[] =
    [
      { key: "lastMonth", label: t("batchHistory.lastMonth") },
      { key: "previousMonth", label: t("batchHistory.previousMonth") },
      { key: "last3Months", label: t("batchHistory.last3Months") },
      { key: "lastHalfYear", label: t("batchHistory.lastHalfYear") },
      { key: "lastYear", label: t("batchHistory.lastYear") },
    ];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const activePeriodLabel =
    activePeriod === "custom"
      ? `${customFrom || "..."} - ${customTo || "..."}`
      : periodButtons.find((p) => p.key === activePeriod)?.label ?? "";

  return (
    <div className="container mx-auto max-w-full space-y-5 overflow-x-hidden p-4 md:space-y-6 md:p-6">
      {/* Print header - visible only in print */}
      <PrintHeader
        teamName={teamName}
        userName={userName}
        filterLabel={activePeriodLabel}
      />

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-bold md:text-3xl">{t("batchHistory.title")}</h1>
        <div className="flex items-center gap-2">
          <HistoryViewToggle
            value={effectiveViewMode}
            onChange={setBatchHistoryViewMode}
          />
          <Button
            variant="outline"
            onClick={handlePrint}
            className="min-h-11"
          >
            <Printer className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("actions.print")}
          </Button>
        </div>
      </div>

      {/* Period filter bar */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {periodButtons.map((pb) => (
          <Button
            key={pb.key}
            variant={activePeriod === pb.key ? "default" : "outline"}
            size="sm"
            className="min-h-11"
            onClick={() => handlePeriodClick(pb.key)}
          >
            {pb.label}
          </Button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("batchHistory.from")}
          </label>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="min-h-11 w-40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("batchHistory.to")}
          </label>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="min-h-11 w-40"
          />
        </div>
        <Button size="sm" className="min-h-11" onClick={handleCustomSearch}>
          <Search className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("actions.search")}
        </Button>
      </div>

      {/* Destroyed only toggle */}
      <label className="flex min-h-11 items-center gap-2 text-sm print:hidden cursor-pointer">
        <input
          type="checkbox"
          checked={destroyedOnly}
          onChange={(e) => setDestroyedOnly(e.target.checked)}
          className="rounded border-input"
        />
        {t("batchHistory.destroyedOnly")}
      </label>

      {/* Data table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("actions.processing")}
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("batchHistory.noRecords")}
        </div>
      ) : (
        <>
          {effectiveViewMode === "cards" && (
            <div className="print:hidden">
              <DestructionHistoryCards
                entries={displayEntries}
                onEdit={setEditEntry}
                onDelete={setDeleteEntry}
              />
            </div>
          )}
          <div
            className={cn(
              "max-w-full overflow-x-auto rounded-lg border print:block",
              effectiveViewMode === "table" ? "block" : "hidden",
            )}
            role="region"
            aria-label={t("history.tableRegion")}
            tabIndex={0}
          >
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("destruction_date")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("batchHistory.destructionDate")}
                    <SortIcon field="destruction_date" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("reagent_name")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("batchHistory.reagentName")}
                    <SortIcon field="reagent_name" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("supplier_name")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("batchHistory.supplier")}
                    <SortIcon field="supplier_name" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("lot_number")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("batchHistory.lotNumber")}
                    <SortIcon field="lot_number" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("expiry_date")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("batchHistory.expiryDate")}
                    <SortIcon field="expiry_date" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("quantity_original")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("batchHistory.quantityOriginal")}
                    <SortIcon field="quantity_original" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("quantity_destroyed")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("batchHistory.quantityDestroyed")}
                    <SortIcon field="quantity_destroyed" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("destroyed_by_name")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("batchHistory.performedBy")}
                    <SortIcon field="destroyed_by_name" />
                  </span>
                </th>
                <th className="px-3 py-2 text-center font-medium print:hidden">
                  {t("actions.actions", { defaultValue: "Actions" })}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDateTime(entry.destruction_date)}
                  </td>
                  <td className="px-3 py-2">{entry.reagent_name}</td>
                  <td className="px-3 py-2">{entry.supplier_name ?? "—"}</td>
                  <td className="px-3 py-2">{entry.lot_number ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {entry.expiry_date ? formatDate(entry.expiry_date) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {entry.quantity_original ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {entry.quantity_destroyed}
                  </td>
                  <td className="px-3 py-2">
                    {entry.destroyed_by_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 print:hidden">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t("actions.edit")}
                        aria-label={t("actions.edit")}
                        className="h-11 w-11 p-0"
                        onClick={() => setEditEntry(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t("actions.delete")}
                        aria-label={t("actions.delete")}
                        className="h-11 w-11 p-0"
                        onClick={() => setDeleteEntry(entry)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <EditLogLineDialog
        entry={editEntry}
        open={editEntry !== null}
        title={t("batchHistory.editTitle", { defaultValue: "Edit record" })}
        fields={editFields}
        onClose={() => setEditEntry(null)}
        onSave={handleSaveEdit}
      />

      <DeleteLogLineDialog
        open={deleteEntry !== null}
        title={t("batchHistory.deleteTitle", { defaultValue: "Delete record" })}
        description={t("batchHistory.deleteDescription", {
          defaultValue:
            "Delete this record? You can also return the item to stock if it was logged by mistake.",
        })}
        recordOnlyLabel={t("batchHistory.deleteRecordOnly", {
          defaultValue: "Delete record only",
        })}
        withSideEffectLabel={t("batchHistory.deleteAndRestore", {
          defaultValue: "Delete and return item to stock",
        })}
        onClose={() => setDeleteEntry(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
