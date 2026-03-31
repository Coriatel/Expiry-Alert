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
import { getDuplicationLog } from "@/lib/tauri";
import type { DuplicationLogEntry } from "@/lib/tauri";

interface DuplicationHistoryProps {
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

type SortField = keyof DuplicationLogEntry;
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

export function DuplicationHistory({ teamName, userName }: DuplicationHistoryProps) {
  const { t } = useTranslation();

  // Period selection
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("lastMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Data
  const [entries, setEntries] = useState<DuplicationLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("received_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Print timestamp
  const [printTimestamp, setPrintTimestamp] = useState(() =>
    new Date().toLocaleString(),
  );

  const loadData = useCallback(
    async (from?: string, to?: string) => {
      setIsLoading(true);
      try {
        const data = await getDuplicationLog(from, to);
        setEntries(data);
      } catch (error) {
        console.error("Failed to load duplication log:", error);
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

  const handleCustomSearch = () => {
    setActivePeriod("custom");
    loadData(customFrom || undefined, customTo || undefined);
  };

  const handlePeriodClick = (key: Exclude<PeriodKey, "custom">) => {
    setActivePeriod(key);
  };

  // Sort
  const displayEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return sortDir === "desc" ? -cmp : cmp;
    });

    return sorted;
  }, [entries, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handlePrint = () => {
    setPrintTimestamp(new Date().toLocaleString());
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Print header - visible only in print */}
      <div className="hidden print:block border-b pb-3 mb-4">
        <div className="flex items-center gap-3">
          <img src="/logo-icon-v2.png" alt="" className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">
              {t("duplicationHistory.title")} - {teamName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {userName} | {printTimestamp}
            </p>
            <p className="text-sm text-muted-foreground">{activePeriodLabel}</p>
          </div>
        </div>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-bold">{t("duplicationHistory.title")}</h1>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("actions.print")}
        </Button>
      </div>

      {/* Period filter bar */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {periodButtons.map((pb) => (
          <Button
            key={pb.key}
            variant={activePeriod === pb.key ? "default" : "outline"}
            size="sm"
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
            className="w-40"
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
            className="w-40"
          />
        </div>
        <Button size="sm" onClick={handleCustomSearch}>
          <Search className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("actions.search")}
        </Button>
      </div>

      {/* Data table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("actions.processing")}
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("duplicationHistory.noRecords")}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("received_date")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("duplicationHistory.receivedDate")}
                    <SortIcon field="received_date" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("reagent_name")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("duplicationHistory.reagentName")}
                    <SortIcon field="reagent_name" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("supplier_name")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("duplicationHistory.supplier")}
                    <SortIcon field="supplier_name" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("lot_number")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("duplicationHistory.lotNumber")}
                    <SortIcon field="lot_number" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("expiry_date")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("duplicationHistory.expiryDate")}
                    <SortIcon field="expiry_date" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("quantity")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("duplicationHistory.quantity")}
                    <SortIcon field="quantity" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 text-start font-medium cursor-pointer select-none"
                  onClick={() => handleSort("received_by_name")}
                >
                  <span className="inline-flex items-center gap-1">
                    {t("duplicationHistory.performedBy")}
                    <SortIcon field="received_by_name" />
                  </span>
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
                    {formatDateTime(entry.received_date)}
                  </td>
                  <td className="px-3 py-2">{entry.reagent_name}</td>
                  <td className="px-3 py-2">{entry.supplier_name ?? "—"}</td>
                  <td className="px-3 py-2">{entry.lot_number ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {entry.expiry_date ? formatDate(entry.expiry_date) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {entry.quantity ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {entry.received_by_name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
