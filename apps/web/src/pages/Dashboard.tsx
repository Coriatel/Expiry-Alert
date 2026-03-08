import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Archive, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReagentTable } from "@/components/ReagentTable";
import { BulkAddForm } from "@/components/BulkAddForm";
import { EditReagentDialog } from "@/components/EditReagentDialog";
import { GeneralNotes } from "@/components/GeneralNotes";
import { NotificationBanner } from "@/components/NotificationBanner";
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
  getGeneralNotes,
  addGeneralNote,
  deleteGeneralNote,
  getExpiringReagents,
  snoozeNotification,
  dismissNotification,
} from "@/lib/tauri";
import type { Reagent, ReagentFormData } from "@/types";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant: "danger" | "warning" | "default";
}

export function Dashboard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [printTimestamp, setPrintTimestamp] = useState(() =>
    new Date().toLocaleString(),
  );
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingReagent, setEditingReagent] = useState<Reagent | null>(null);
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
    generalNotes,
    expiringReagents,
    selectedReagentIds,
    setReagents,
    setGeneralNotes,
    setExpiringReagents,
    setSelectedReagentIds,
    toggleReagentSelection,
    clearSelection,
  } = useStore();

  // Load data
  const loadData = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background ?? false;
      try {
        if (!background) {
          setIsLoading(true);
        }
        const [reagentsData, notesData, expiringData] = await Promise.all([
          getActiveReagents(),
          getGeneralNotes(),
          getExpiringReagents(),
        ]);
        setReagents(reagentsData);
        setGeneralNotes(notesData);
        setExpiringReagents(expiringData);
      } catch (error) {
        console.error("Failed to load data:", error);
        if (!background) {
          showToast(t("errors.loadFailed"), "error");
        }
      } finally {
        if (!background) {
          setIsLoading(false);
        }
      }
    },
    [setReagents, setGeneralNotes, setExpiringReagents, showToast, t],
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
      console.error("Failed to load expiring reagents:", error);
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

  const handleAddNote = async (content: string) => {
    try {
      await addGeneralNote(content);
      const notes = await getGeneralNotes();
      setGeneralNotes(notes);
      showToast(t("success.noteAdded"), "success");
    } catch (error) {
      console.error("Failed to add note:", error);
      showToast(
        error instanceof Error ? error.message : t("errors.addNoteFailed"),
        "error",
      );
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await deleteGeneralNote(id);
      const notes = await getGeneralNotes();
      setGeneralNotes(notes);
      showToast(t("success.noteDeleted"), "success");
    } catch (error) {
      console.error("Failed to delete note:", error);
      showToast(t("errors.deleteNoteFailed"), "error");
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
    if (selectedReagentIds.length === reagents.length) {
      clearSelection();
    } else {
      setSelectedReagentIds(reagents.map((r) => r.id));
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
      <div className="hidden print:block border-b pb-3">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.printedAt", { at: printTimestamp })}
        </p>
      </div>

      {/* Notification Banner */}
      <div className="print:hidden">
        <NotificationBanner
          reagents={expiringReagents}
          onSnooze={handleSnooze}
          onDismiss={handleDismiss}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* General Notes */}
      <div className="max-w-2xl">
        <GeneralNotes
          notes={generalNotes}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
        />
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

      {/* Reagents Table */}
      <ReagentTable
        reagents={reagents}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onArchive={handleArchive}
        selectedIds={selectedReagentIds}
        onToggleSelect={toggleReagentSelection}
        onSelectAll={handleSelectAll}
      />

      {/* Edit Dialog */}
      <EditReagentDialog
        reagent={editingReagent}
        open={editingReagent !== null}
        onClose={() => setEditingReagent(null)}
        onSave={handleEditSave}
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
