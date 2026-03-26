import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  Archive,
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
import { ExpiryAlertSection } from "@/components/ExpiryAlertSection";
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
  deleteReagent,
  deleteReagentsBulk,
  archiveReagent,
  archiveReagentsBulk,
  getExpiringReagents,
  snoozeNotification,
  dismissNotification,
  duplicateReagent,
} from "@/lib/tauri";
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

export function Dashboard() {
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
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "default",
  });

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

  const handleBulkDelete = () => {
    if (selectedReagentIds.length === 0) return;

    setConfirmState({
      open: true,
      title: t("confirm.deleteMultipleTitle"),
      message: t("confirm.deleteMultipleMessage", {
        count: selectedReagentIds.length,
      }),
      variant: "danger",
      onConfirm: async () => {
        try {
          await deleteReagentsBulk(selectedReagentIds);
          await loadData();
          clearSelection();
          showToast(
            t("success.reagentsDeleted", { count: selectedReagentIds.length }),
            "success",
          );
        } catch (error) {
          console.error("Failed to delete reagents:", error);
          showToast(t("errors.deleteFailed"), "error");
        }
      },
    });
  };

  const handleArchive = async (id: number) => {
    try {
      await archiveReagent(id);
      await loadData();
      clearSelection();
      showToast(t("success.reagentArchived"), "success");
    } catch (error) {
      console.error("Failed to archive reagent:", error);
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
    <div className="container mx-auto p-6 space-y-6">
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

      {/* Push Notification Prompt */}
      <PushPromptBanner />

      {/* Inline Alert Section */}
      <ExpiryAlertSection
        reagents={expiringReagents}
        onSnooze={handleSnooze}
        onDismiss={handleDismiss}
      />

      {/* Expiry Calendar & Timeline */}
      <div className="bg-card rounded-xl border print:hidden">
        <button
          onClick={() => setCalendarExpanded(!calendarExpanded)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span className="font-semibold">{t("calendar.title")}</span>
          </div>
          {calendarExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {calendarExpanded && (
          <div className="px-4 pb-4 grid gap-6 md:grid-cols-2">
            <ExpiryCalendar reagents={reagents} />
            <div>
              <h3 className="font-semibold mb-3">{t("calendar.timeline")}</h3>
              <ExpiryTimeline reagents={reagents} />
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="print:hidden"
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
                className="print:hidden"
              >
                <Archive className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("actions.bulkArchive")} ({selectedReagentIds.length})
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isLoading}
                className="print:hidden"
              >
                <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("actions.bulkDelete")} ({selectedReagentIds.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Add Button */}
      {!showBulkAdd && (
        <Button
          onClick={() => setShowBulkAdd(true)}
          disabled={isLoading}
          className="print:hidden"
        >
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("dashboard.addMultiple")}
        </Button>
      )}

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
            onArchive={handleArchive}
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
            onArchive={handleArchive}
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
          onArchive={handleArchive}
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
