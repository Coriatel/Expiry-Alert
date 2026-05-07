import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  createReagentCatalogItem,
  type Supplier,
  type ReagentCatalogItem,
} from '@/lib/tauri';

interface CreateCatalogItemDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (item: ReagentCatalogItem) => void;
  suppliers: Supplier[];
  defaultSupplierId?: number;
}

export function CreateCatalogItemDialog({
  open,
  onClose,
  onCreated,
  suppliers,
  defaultSupplierId,
}: CreateCatalogItemDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>(defaultSupplierId ?? '');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setName('');
    setSupplierId(defaultSupplierId ?? '');
    setCatalogNumber('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || supplierId === '') return;
    setSaving(true);
    setError('');
    try {
      const item = await createReagentCatalogItem(
        name.trim(),
        Number(supplierId),
        catalogNumber.trim() || undefined,
      );
      setName('');
      setSupplierId(defaultSupplierId ?? '');
      setCatalogNumber('');
      onCreated(item);
    } catch {
      setError(t('catalog.createError'));
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = name.trim().length > 0 && supplierId !== '' && !saving;

  return (
    <Dialog open={open} onClose={handleClose} title={t('catalog.createNewReagent')}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('catalog.reagentName')} *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('catalog.reagentName')}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('catalog.supplier')} *</label>
          <Select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">{t('catalog.selectSupplier')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('catalog.catalogNumber')}
          </label>
          <Input
            value={catalogNumber}
            onChange={(e) => setCatalogNumber(e.target.value)}
            placeholder={t('catalog.catalogNumber')}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? t('catalog.creating') : t('actions.save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
