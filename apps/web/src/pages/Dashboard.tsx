import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  Copy,
  Archive,
  Printer,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReagentTable } from "@/components/ReagentTable";
import { ReagentCardList } from "@/components/ReagentCardList";
import { BulkAddForm } from "@/components/BulkAddForm";
import { EditReagentDialog } from "@/components/EditReagentDialog";
import { DuplicateReagentDialog } from "@/components/DuplicateReagentDialog";
import { DestructionDialog } from "@/components/DestructionDialog";
import { ExpiryAlertSection } from "@/components/ExpiryAlertSection";
import { TransferRequestsBanner } from "@/components/TransferRequestsBanner";
import { RequestTransferDialog } from "@/components/RequestTransferDialog";
import { FilterSortToolbar } from "@/components/FilterSortToolbar";
import { PushPromptBanner } from "@/components/PushPromptBanner";
import { ExpiryCalendar } from "@/components/ExpiryCalendar";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useStore } from "@/store/store";
import { useToast } from "@/components/ui/Toast";
import {
  getActiveReagents,
  addReagentsBulk,
  updateReagent,
  updateReagentInTreatment,
  deleteReagent,
  archiveReagentsBulk,
  destroyReagent,
  getExpiringReagents,
  snoozeNotification,
  dismissNotification,
  duplicateReagent,
  importReagentsToTeam,
  getTeams,
} from "@/lib/tauri";
import type { TeamSummary } from "@/lib/tauri";
import { getExpiryStatus, getDaysUntilExpiry } from "@/lib/utils";
import type { Reagent, ReagentFormData } from "@/types";
import type { SortingState } from "@tanstack/react-table";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant: "danger" | "warning" | "default";
}

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "Unauthorized";
}

interface DashboardProps {
  teamName?: string;
}

export function Dashboard({ teamName }: DashboardProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const isMobile = useIsMobile();
  const [printTimestamp, setPrintTimestamp] = useState(() =>
    new Date().toLocaleString(),
  );
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingReagent, setEditingReagent] = useState<Reagent | null>(null);
  const [duplicatingReagent, setDuplicatingReagent] = useState<Reagent | null>(
    null,
  );
  const [destroyingReagent, setDestroyingReagent] = useState<Reagent | null>(
    null,
  );
  const bulkDestroyQueueRef = useRef<number[]>([]);
  const bulkDestroyDoneRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "default",
  });

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [copyTeamId, setCopyTeamId] = useState("");
  const [requestTransferOpen, setRequestTransferOpen] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);

  const {
    reagents,
    expiringReagents,
    selectedReagentIds,
    setReagents,
    setExpiringReagents,
    setSelectedReagentIds,
    toggleReagentSelection,
    clearSelection,
    // Preferences
    viewMode,
    statusFilter,
    categoryFilter,
    sortField,
    sortDirection,
    setViewMode,
    setStatusFilter,
    setCategoryFilter,
    setSortField,
    setSortDirection,
    calendarExpanded,
    setCalendarExpanded,
  } = useStore();

  // Effective view mode: use preference, but default to cards on mobile if never set
  const effectiveViewMode = viewMode ?? (isMobile ? "cards" : "table");

  // Load data
  const loadData = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background ?? false;
      try {
        if (!background) {
          setIsLoading(true);
        }
        const [reagentsData, expiringData] = await Promise.all([
          getActiveReagents(),
          getExpiringReagents(),
        ]);
        setReagents(reagentsData);
        setExpiringReagents(expiringData);
      } catch (error) {
        console.error("Failed to load data:", error);
        if (!background && !isUnauthorizedError(error)) {
          showToast(t("errors.loadFailed"), "error");
        }
      } finally {
        if (!background) {
          setIsLoading(false);
        }
      }
    },
    [setReagents, setExpiringReagents, showToast, t],
  );

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => {
      void loadData({ background: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load teams for import feature
  useEffect(() => {
    getTeams()
      .then((data) => {
        setTeams(data.teams);
        setCurrentTeamId(data.currentTeamId);
      })
      .catch(console.error);
  }, []);

  const otherTeams = useMemo(
    () => teams.filter((team) => team.id !== currentTeamId),
    [teams, currentTeamId],
  );

  const handleImportToTeam = (team: TeamSummary) => {
    setConfirmState({
      open: true,
      title: t("import.title"),
      message: t("import.confirmMessage", {
        count: selectedReagentIds.length,
        team: `\u2068${team.name}\u2069`,
      }),
      variant: "default",
      onConfirm: async () => {
        try {
          const result = await importReagentsToTeam(
            team.id,
            selectedReagentIds,
          );
          clearSelection();
          showToast(
            t("import.success", { count: result.copied }),
            "success",
          );
        } catch (error) {
          console.error("Failed to import:", error);
          showToast(t("errors.importFailed") || "Import failed", "error");
        }
      },
    });
  };

  const loadExpiringReagents = async () => {
    try {
      const data = await getExpiringReagents();
      setExpiringReagents(data);
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error("Failed to load expiring reagents:", error);
      }
    }
  };

  // Filter & sort reagents
  const filteredReagents = useMemo(() => {
    let result = reagents;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(
        (r) => getExpiryStatus(r.expiry_date) === statusFilter,
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((r) => r.category === categoryFilter);
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "days_until_expiry":
          cmp =
            getDaysUntilExpiry(a.expiry_date) -
            getDaysUntilExpiry(b.expiry_date);
          break;
        case "expiry_date":
        default:
          cmp = a.expiry_date.localeCompare(b.expiry_date);
          break;
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });

    return sorted;
  }, [reagents, statusFilter, categoryFilter, sortField, sortDirection]);

  // Convert sort state for TanStack table
  const tableSorting: SortingState = [
    { id: sortField, desc: sortDirection === "desc" },
  ];
  const handleTableSortingChange = (newSorting: SortingState) => {
    if (newSorting.length > 0) {
      setSortField(newSorting[0].id);
      setSortDirection(newSorting[0].desc ? "desc" : "asc");
    }
  };

  const handleBulkAdd = async (reagentsData: ReagentFormData[]) => {
    try {
      setIsLoading(true);
      await addReagentsBulk(reagentsData);
      setShowBulkAdd(false);
      await loadData();
      showToast(
        t("success.reagentsAdded", { count: reagentsData.length }),
        "success",
      );
    } catch (error) {
      console.error("Failed to add reagents:", error);
      showToast(
        error instanceof Error ? error.message : t("errors.addFailed"),
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (reagent: Reagent) => {
    setEditingReagent(reagent);
  };

  const handleEditSave = async (id: number, data: ReagentFormData) => {
    const current = reagents.find((reagent) => reagent.id === id);
    await updateReagent(id, data, current);
    await loadData();
    showToast(t("success.reagentUpdated"), "success");
  };

  const handleToggleInTreatment = async (id: number, value: boolean) => {
    try {
      await updateReagentInTreatment(id, value);
      await loadData();
      showToast(t("success.reagentUpdated"), "success");
    } catch (error) {
      console.error("Failed to update treatment status:", error);
      showToast(t("errors.updateFailed"), "error");
    }
  };

  const handleDuplicate = (reagent: Reagent) => {
    setDuplicatingReagent(reagent);
  };

  const handleDuplicateSave = async (
    data: ReagentFormData,
    originalId: number,
  ) => {
    await duplicateReagent(originalId, data);
    await loadData();
    showToast(t("success.reagentDuplicated"), "success");
  };

  const handleDelete = (id: number) => {
    const reagent = reagents.find((r) => r.id === id);
    setConfirmState({
      open: true,
      title: t("confirm.deleteTitle"),
      message: t("confirm.deleteMessage", { name: reagent?.name || "" }),
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteReagent(id);
          await loadData();
          clearSelection();
          showToast(t("success.reagentDeleted"), "success");
        } catch (error) {
          console.error("Failed to delete reagent:", error);
          showToast(t("errors.deleteFailed"), "error");
        }
      },
    });
  };

  const pickNextFromQueue = (): Reagent | null => {
    while (bulkDestroyQueueRef.current.length > 0) {
      const nextId = bulkDestroyQueueRef.current.shift()!;
      const next = reagents.find((r) => r.id === nextId);
      if (next) return next;
    }
    return null;
  };

  const finishBulkDestroy = async (cancelled: boolean) => {
    const done = bulkDestroyDoneRef.current;
    bulkDestroyQueueRef.current = [];
    bulkDestroyDoneRef.current = 0;
    setDestroyingReagent(null);
    if (done > 0) {
      await loadData();
      clearSelection();
      showToast(
        t("success.reagentsDestroyed", { count: done, defaultValue: `${done} פריטים הושמדו` }),
        "success",
      );
    } else if (cancelled) {
      setDestroyingReagent(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedReagentIds.length === 0) return;
    bulkDestroyQueueRef.current = [...selectedReagentIds];
    bulkDestroyDoneRef.current = 0;
    const first = pickNextFromQueue();
    if (!first) return;
    setDestroyingReagent(first);
  };

  const handleDestroy = (reagent: Reagent) => {
    setDestroyingReagent(reagent);
  };

  const handleDestroyConfirm = async (
    reagentId: number,
    quantityDestroyed: number,
  ) => {
    const reagent = reagents.find((r) => r.id === reagentId);
    if (!reagent) return;
    try {
      await destroyReagent({
        reagent_id: reagentId,
        reagent_name: reagent.name,
        supplier_name: reagent.supplier_name ?? undefined,
        lot_number: reagent.lot_number ?? undefined,
        expiry_date: reagent.expiry_date,
        quantity_original: reagent.quantity ?? undefined,
        quantity_destroyed: quantityDestroyed,
      });
      const isBulk =
        bulkDestroyQueueRef.current.length > 0 ||
        bulkDestroyDoneRef.current > 0;
      if (isBulk) {
        bulkDestroyDoneRef.current += 1;
        const next = pickNextFromQueue();
        if (next) {
          setDestroyingReagent(next);
        } else {
          await finishBulkDestroy(false);
        }
      } else {
        setDestroyingReagent(null);
        await loadData();
        clearSelection();
        showToast(t("success.reagentArchived"), "success");
      }
    } catch (error) {
      console.error("Failed to destroy reagent:", error);
      showToast(t("errors.archiveFailed"), "error");
    }
  };

  // Confirmed like every other bulk operation: the compact toolbar puts this button
  // next to the destructive one, so an unguarded mis-tap would archive the whole selection.
  const handleBulkArchive = () => {
    if (selectedReagentIds.length === 0) return;
    setConfirmState({
      open: true,
      title: t("actions.bulkArchive"),
      message: t("confirm.bulkArchiveMessage", {
        count: selectedReagentIds.length,
      }),
      variant: "warning",
      onConfirm: async () => {
        try {
          await archiveReagentsBulk(selectedReagentIds);
          await loadData();
          clearSelection();
          showToast(
            t("success.reagentsArchived", { count: selectedReagentIds.length }),
            "success",
          );
        } catch (error) {
          console.error("Failed to archive reagents:", error);
          showToast(t("errors.archiveFailed"), "error");
        }
      },
    });
  };

  const handleSnoozeAll = async (reagentIds: number[], days: number) => {
    if (reagentIds.length === 0) return;
    const results = await Promise.allSettled(
      reagentIds.map((id) => snoozeNotification(id, days)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    await loadExpiringReagents();
    if (failed === reagentIds.length) {
      showToast(t("errors.snoozeFailed"), "error");
      return;
    }
    showToast(
      t("success.notificationsSnoozed", { count: reagentIds.length - failed }),
      "success",
    );
    if (failed > 0) {
      showToast(t("errors.snoozeFailed"), "error");
    }
  };

  const handleDismiss = async (reagentId: number, alertType?: string) => {
    try {
      await dismissNotification(reagentId, alertType);
      loadExpiringReagents();
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  const handleSelectAll = () => {
    if (selectedReagentIds.length === filteredReagents.length) {
      clearSelection();
    } else {
      setSelectedReagentIds(filteredReagents.map((r) => r.id));
    }
  };

  const closeConfirmDialog = () => {
    setConfirmState((prev) => ({ ...prev, open: false }));
  };

  const handlePrint = () => {
    setPrintTimestamp(new Date().toLocaleString());
    window.print();
  };

  return (
    <div className="container mx-auto max-w-full space-y-2.5 overflow-x-hidden p-3 md:space-y-6 md:p-6">
      {/* Print header */}
      <div className="hidden print:block border-b pb-3 mb-4">
        <div className="flex items-center gap-3">
          <img src="/logo-icon-v2.png" alt="" className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.printedAt", { at: printTimestamp })}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-1.5 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">{t("dashboard.title")}</h1>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-11 w-11 shrink-0 p-0 sm:w-auto sm:px-4"
            aria-label={t("actions.print")}
          >
            <Printer className="h-4 w-4 sm:ltr:mr-2 sm:rtl:ml-2" />
            <span className="hidden sm:inline">{t("actions.print")}</span>
          </Button>
        </div>

        {!showBulkAdd && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              onClick={() => setShowBulkAdd(true)}
              disabled={isLoading}
              className="min-h-11 min-w-0 px-3"
            >
              <Plus className="h-4 w-4 shrink-0 ltr:mr-2 rtl:ml-2" />
              <span className="truncate">{t("dashboard.addMultiple")}</span>
            </Button>
            {otherTeams.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setRequestTransferOpen(true)}
                disabled={isLoading}
                className="min-h-11 min-w-0 px-3"
              >
                <span className="truncate">{t("dashboard.requestItems")}</span>
              </Button>
            )}
          </div>
        )}

        {/* Mounted at all times: a live region inserted together with its text is not announced. */}
        <p className="sr-only" aria-live="polite">
          {selectedReagentIds.length > 0
            ? t("table.selected", { count: selectedReagentIds.length })
            : ""}
        </p>

        {selectedReagentIds.length > 0 && (
          <div
            data-testid="bulk-actions"
            role="group"
            aria-label={t("bulk.panelLabel")}
            className="rounded-lg border bg-muted/40 p-2"
          >
            <p className="mb-1.5 text-sm font-medium">
              {t("table.selected", { count: selectedReagentIds.length })}
            </p>
            <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
              <Button
                variant="outline"
                onClick={handleBulkArchive}
                disabled={isLoading}
                aria-label={`${t("bulk.archiveShort")} - ${t("actions.bulkArchive")} (${selectedReagentIds.length})`}
                className="min-h-11 min-w-0 px-2 text-sm"
              >
                <Archive className="h-4 w-4 shrink-0 ltr:mr-1.5 rtl:ml-1.5" />
                <span className="truncate">{t("bulk.archiveShort")}</span>
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isLoading}
                aria-label={`${t("bulk.deleteShort")} - ${t("actions.bulkDelete")} (${selectedReagentIds.length})`}
                className="min-h-11 min-w-0 px-2 text-sm"
              >
                <Trash2 className="h-4 w-4 shrink-0 ltr:mr-1.5 rtl:ml-1.5" />
                <span className="truncate">{t("bulk.deleteShort")}</span>
              </Button>
              {otherTeams.length === 1 && (
                <Button
                  variant="outline"
                  onClick={() => handleImportToTeam(otherTeams[0])}
                  disabled={isLoading}
                  title={otherTeams[0].name}
                  className="col-span-2 min-h-11 min-w-0 px-2 text-sm min-[420px]:col-span-1"
                >
                  <Copy className="h-4 w-4 shrink-0 ltr:mr-1.5 rtl:ml-1.5" />
                  {/* Truncate the isolated name, not the mixed-direction span: an RTL span
                      clips the head of an LTR name and hides which team is targeted. */}
                  <span className="flex min-w-0 items-baseline">
                    {t("bulk.copyToPrefix")}
                    <bdi dir="auto" className="truncate">
                      {otherTeams[0].name}
                    </bdi>
                  </span>
                </Button>
              )}
              {otherTeams.length > 1 && (
                // One compact destination control instead of a full-width button per team.
                // The copy fires on the explicit button, never on `change`: arrow-key
                // navigation on a closed <select> fires change on every keypress.
                <div className="col-span-2 flex gap-1.5 min-[420px]:col-span-1">
                  <label htmlFor="bulk-copy-team" className="sr-only">
                    {t("bulk.copyToTeam")}
                  </label>
                  <Select
                    id="bulk-copy-team"
                    value={copyTeamId}
                    disabled={isLoading}
                    className="min-h-11 min-w-0 flex-1 text-sm"
                    onChange={(event) => setCopyTeamId(event.target.value)}
                  >
                    <option value="">{t("bulk.copyToTeam")}</option>
                    {otherTeams.map((team) => (
                      <option key={team.id} value={team.id} dir="auto">
                        {team.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="outline"
                    disabled={!copyTeamId || isLoading}
                    aria-label={t("bulk.copyToTeam")}
                    title={t("bulk.copyToTeam")}
                    onClick={() => {
                      const team = otherTeams.find(
                        (option) => String(option.id) === copyTeamId,
                      );
                      if (team) handleImportToTeam(team);
                      setCopyTeamId("");
                    }}
                    className="h-11 w-11 shrink-0 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Push Notification Prompt */}
      <PushPromptBanner />

      {/* Transfer requests (incoming pending + outgoing approved) */}
      <TransferRequestsBanner teams={teams} />

      {/* Inline Alert Section */}
      <ExpiryAlertSection
        reagents={expiringReagents}
        onSnoozeAll={handleSnoozeAll}
        onDismiss={handleDismiss}
        teamName={teamName}
      />

      {/* Expiry Calendar & Timeline */}
      <div className="bg-card rounded-lg border print:hidden">
        <button
          onClick={() => setCalendarExpanded(!calendarExpanded)}
          className="flex min-h-11 w-full items-center justify-between gap-3 p-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={calendarExpanded}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-5 w-5 shrink-0" />
            <span className="font-semibold truncate">{t("calendar.title")}</span>
          </div>
          {calendarExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </button>
        {calendarExpanded && (
          <div className="px-4 pb-4">
            <ExpiryCalendar reagents={reagents} />
          </div>
        )}
      </div>

      {/* Bulk Add Form */}
      {showBulkAdd && (
        <div className="print:hidden">
          <BulkAddForm
            onSave={handleBulkAdd}
            onCancel={() => setShowBulkAdd(false)}
          />
        </div>
      )}

      {/* Filter/Sort Toolbar */}
      <FilterSortToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        viewMode={effectiveViewMode}
        onViewModeChange={setViewMode}
      />

      {/* Reagents View */}
      {effectiveViewMode === "cards" ? (
        <>
          <ReagentCardList
            reagents={filteredReagents}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onArchive={(id) => {
              const r = reagents.find((x) => x.id === id);
              if (r) handleDestroy(r);
            }}
            onToggleInTreatment={(id, value) => {
              void handleToggleInTreatment(id, value);
            }}
            selectedIds={selectedReagentIds}
            onToggleSelect={toggleReagentSelection}
            onSelectAll={handleSelectAll}
          />
          {/* Hidden table for print */}
          <ReagentTable
            reagents={filteredReagents}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onArchive={(id) => {
              const r = reagents.find((x) => x.id === id);
              if (r) handleDestroy(r);
            }}
            onToggleInTreatment={(id, value) => {
              void handleToggleInTreatment(id, value);
            }}
            selectedIds={selectedReagentIds}
            onToggleSelect={toggleReagentSelection}
            onSelectAll={handleSelectAll}
            sorting={tableSorting}
            onSortingChange={handleTableSortingChange}
            className="hidden print:block"
          />
        </>
      ) : (
        <ReagentTable
          reagents={filteredReagents}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onArchive={(id) => {
            const r = reagents.find((x) => x.id === id);
            if (r) handleDestroy(r);
          }}
          onToggleInTreatment={(id, value) => {
            void handleToggleInTreatment(id, value);
          }}
          selectedIds={selectedReagentIds}
          onToggleSelect={toggleReagentSelection}
          onSelectAll={handleSelectAll}
          sorting={tableSorting}
          onSortingChange={handleTableSortingChange}
        />
      )}

      {/* Edit Dialog */}
      <EditReagentDialog
        reagent={editingReagent}
        open={editingReagent !== null}
        onClose={() => setEditingReagent(null)}
        onSave={handleEditSave}
      />

      {/* Duplicate Dialog */}
      <DuplicateReagentDialog
        reagent={duplicatingReagent}
        open={duplicatingReagent !== null}
        onClose={() => setDuplicatingReagent(null)}
        onSave={handleDuplicateSave}
      />

      {/* Destruction Dialog */}
      <DestructionDialog
        reagent={destroyingReagent}
        open={destroyingReagent !== null}
        onClose={() => {
          const inBulk =
            bulkDestroyQueueRef.current.length > 0 ||
            bulkDestroyDoneRef.current > 0;
          if (inBulk) {
            void finishBulkDestroy(true);
          } else {
            setDestroyingReagent(null);
          }
        }}
        onConfirm={handleDestroyConfirm}
      />

      <RequestTransferDialog
        open={requestTransferOpen}
        onClose={() => setRequestTransferOpen(false)}
        teams={otherTeams}
        onSent={() => showToast(
          t("transferRequests.sent", { defaultValue: "הבקשה נשלחה" }),
          "success",
        )}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        onClose={closeConfirmDialog}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
      />
    </div>
  );
}
