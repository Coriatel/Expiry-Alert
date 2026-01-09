import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/store/store';
import {
  getArchivedReagents,
  restoreReagent,
  deleteReagent,
  deleteReagentsBulk,
} from '@/lib/tauri';
import type { Reagent } from '@/types';
import { formatDate, getDaysUntilExpiry } from '@/lib/utils';

export function Archive() {
  const { t } = useTranslation();
  const { archivedReagents, setArchivedReagents } = useStore();
  const [selectedIds, setSelectedIds] = useState<number[]>(]);

  useEffect(() => {
    loadArchivedReagents();
  }, []);

  const loadArchivedReagents = async () => {
    try {
      const data = await getArchivedReagents();
      setArchivedReagents(data);
    } catch (error) {
      console.error('Failed to load archived reagents:', error);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restoreReagent(id);
      loadArchivedReagents();
    } catch (error) {
      console.error('Failed to restore reagent:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('confirm.delete'))) {
      try {
        await deleteReagent(id);
        loadArchivedReagents();
      } catch (error) {
        console.error('Failed to delete reagent:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (
      selectedIds.length > 0 &&
      confirm(t('confirm.deleteMultiple', { count: selectedIds.length }))
    ) {
      try {
        await deleteReagentsBulk(selectedIds);
        loadArchivedReagents();
        setSelectedIds([]);
      } catch (error) {
        console.error('Failed to delete reagents:', error);
      }
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('archive.title')}</h1>
        {selectedIds.length > 0 && (
          <Button variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t('actions.bulkDelete')} ({selectedIds.length})
          </Button>
        )}
      </div>

      {archivedReagents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t('archive.empty')}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-start">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === archivedReagents.length}
                    onChange={() =>
                      setSelectedIds(
                        selectedIds.length === archivedReagents.length
                          ? []
                          : archivedReagents.map((r) => r.id)
                      )
                    }
                  />
                </th>
                <th className="px-4 py-3 text-start">{t('table.name')}</th>
                <th className="px-4 py-3 text-start">{t('table.category')}</th>
                <th className="px-4 py-3 text-start">{t('table.expiryDate')}</th>
                <th className="px-4 py-3 text-start">{t('table.lotNumber')}</th>
                <th className="px-4 py-3 text-start">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {archivedReagents.map((reagent) => (
                <tr key={reagent.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(reagent.id)}
                      onChange={() => toggleSelect(reagent.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{reagent.name}</td>
                  <td className="px-4 py-3">{t(`category.${reagent.category}`)}</td>
                  <td className="px-4 py-3">{formatDate(reagent.expiry_date)}</td>
                  <td className="px-4 py-3">{reagent.lot_number || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(reagent.id)}
                        title={t('actions.restore')}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(reagent.id)}
                        title={t('actions.delete')}
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
      )}
    </div>
  );
}
