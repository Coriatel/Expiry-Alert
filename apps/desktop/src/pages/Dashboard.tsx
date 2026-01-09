import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReagentTable } from '@/components/ReagentTable';
import { BulkAddForm } from '@/components/BulkAddForm';
import { GeneralNotes } from '@/components/GeneralNotes';
import { NotificationBanner } from '@/components/NotificationBanner';
import { useStore } from '@/store/store';
import {
  getActiveReagents,
  addReagentsBulk,
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
} from '@/lib/tauri';
import type { ReagentFormData } from '@/types';

export function Dashboard() {
  const { t } = useTranslation();
  const [showBulkAdd, setShowBulkAdd] = useState(false);

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
  useEffect(() => {
    loadData();
    // Check for expiring reagents every 5 minutes
    const interval = setInterval(loadExpiringReagents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [reagentsData, notesData, expiringData] = await Promise.all([
        getActiveReagents(),
        getGeneralNotes(),
        getExpiringReagents(),
      ]);
      setReagents(reagentsData);
      setGeneralNotes(notesData);
      setExpiringReagents(expiringData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadExpiringReagents = async () => {
    try {
      const data = await getExpiringReagents();
      setExpiringReagents(data);
    } catch (error) {
      console.error('Failed to load expiring reagents:', error);
    }
  };

  const handleBulkAdd = async (reagentsData: ReagentFormData[]) => {
    try {
      await addReagentsBulk(reagentsData);
      setShowBulkAdd(false);
      loadData();
    } catch (error) {
      console.error('Failed to add reagents:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('confirm.delete'))) {
      try {
        await deleteReagent(id);
        loadData();
        clearSelection();
      } catch (error) {
        console.error('Failed to delete reagent:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (
      selectedReagentIds.length > 0 &&
      confirm(t('confirm.deleteMultiple', { count: selectedReagentIds.length }))
    ) {
      try {
        await deleteReagentsBulk(selectedReagentIds);
        loadData();
        clearSelection();
      } catch (error) {
        console.error('Failed to delete reagents:', error);
      }
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await archiveReagent(id);
      loadData();
      clearSelection();
    } catch (error) {
      console.error('Failed to archive reagent:', error);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedReagentIds.length > 0) {
      try {
        await archiveReagentsBulk(selectedReagentIds);
        loadData();
        clearSelection();
      } catch (error) {
        console.error('Failed to archive reagents:', error);
      }
    }
  };

  const handleAddNote = async (content: string) => {
    try {
      await addGeneralNote(content);
      const notes = await getGeneralNotes();
      setGeneralNotes(notes);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await deleteGeneralNote(id);
      const notes = await getGeneralNotes();
      setGeneralNotes(notes);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleSnooze = async (reagentId: number, days: number) => {
    try {
      await snoozeNotification(reagentId, days);
      loadExpiringReagents();
    } catch (error) {
      console.error('Failed to snooze notification:', error);
    }
  };

  const handleDismiss = async (reagentId: number) => {
    try {
      await dismissNotification(reagentId);
      loadExpiringReagents();
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedReagentIds.length === reagents.length) {
      clearSelection();
    } else {
      setSelectedReagentIds(reagents.map((r) => r.id));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Notification Banner */}
      <NotificationBanner
        reagents={expiringReagents}
        onSnooze={handleSnooze}
        onDismiss={handleDismiss}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <div className="flex gap-2">
          {selectedReagentIds.length > 0 && (
            <>
              <Button variant="outline" onClick={handleBulkArchive}>
                <Archive className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t('actions.bulkArchive')} ({selectedReagentIds.length})
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t('actions.bulkDelete')} ({selectedReagentIds.length})
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
        <Button onClick={() => setShowBulkAdd(true)}>
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t('dashboard.addMultiple')}
        </Button>
      )}

      {/* Bulk Add Form */}
      {showBulkAdd && (
        <BulkAddForm onSave={handleBulkAdd} onCancel={() => setShowBulkAdd(false)} />
      )}

      {/* Reagents Table */}
      <ReagentTable
        reagents={reagents}
        onEdit={() => {}}
        onDelete={handleDelete}
        onArchive={handleArchive}
        selectedIds={selectedReagentIds}
        onToggleSelect={toggleReagentSelection}
        onSelectAll={handleSelectAll}
      />
    </div>
  );
}
