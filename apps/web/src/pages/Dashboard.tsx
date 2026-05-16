import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  Flame,
  Printer,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
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
import { ExpiryTimeline } from "@/components/ExpiryTimeline";
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
        team: team.name,
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
    await updateReagent(id, data);
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

  const handleBulkArchive = async () => {
    if (selectedReagentIds.length === 0) return;

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
  };

  const handleSnooze = async (reagentId: number, days: number) => {
    try {
      await snoozeNotification(reagentId, days);
      loadExpiringReagents();
      showToast(t("success.notificationSnoozed"), "success");
    } catch (error) {
      console.error("Failed to snooze notification:", error);
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
    <div className="container mx-auto max-w-full overflow-x-hidden p-4 md:p-6 space-y-5 md:space-y-6">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <h1 className="text-2xl md:text-3xl font-bold">{t("dashboard.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="print:hidden w-full sm:w-auto"
          >
            <Printer className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("actions.print")}
          </Button>
          {selectedReagentIds.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleBulkArchive}
                disabled={isLoading}
                className="print:hidden w-full sm:w-auto"
              >
                <Flame className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("actions.bulkArchive")} ({selectedReagentIds.length})
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isLoading}
                className="print:hidden w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("actions.bulkDelete")} ({selectedReagentIds.length})
              </Button>
              {otherTeams.map((team) => (
                <Button
                  key={team.id}
                  variant="outline"
                  onClick={() => handleImportToTeam(team)}
                  disabled={isLoading}
                  className="print:hidden w-full sm:w-auto"
                >
                  {t("import.copyTo", { team: team.name })}
                </Button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Add Button + Request transfer */}
      {!showBulkAdd && (
        <div className="grid gap-2 sm:flex sm:flex-wrap print:hidden">
          <Button
            onClick={() => setShowBulkAdd(true)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("dashboard.addMultiple")}
          </Button>
          {otherTeams.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setRequestTransferOpen(true)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {t("transferRequests.requestButton", {
                defaultValue: "בקש פריטים מצוות אחר",
              })}
            </Button>
          )}
        </div>
      )}

      {/* Push Notification Prompt */}
      <PushPromptBanner />

      {/* Transfer requests (incoming pending + outgoing approved) */}
      <TransferRequestsBanner teams={teams} />

      {/* Inline Alert Section */}
      <ExpiryAlertSection
        reagents={expiringReagents}
        onSnooze={handleSnooze}
        onDismiss={handleDismiss}
        teamName={teamName}
      />

      {/* Expiry Calendar & Timeline */}
      <div className="bg-card rounded-lg border print:hidden">
        <button
          onClick={() => setCalendarExpanded(!calendarExpanded)}
          className="w-full flex items-center justify-between gap-3 p-4 text-start"
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
          <div className="px-4 pb-4 grid gap-6 md:grid-cols-2">
            <ExpiryCalendar reagents={reagents} />
            <div className="min-w-0">
              <h3 className="font-semibold mb-3">{t("calendar.timeline")}</h3>
              <ExpiryTimeline reagents={reagents} />
            </div>
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
