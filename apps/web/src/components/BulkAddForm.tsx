import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, X } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DateInput } from '@/components/ui/DateInput';
import { Select } from '@/components/ui/Select';
import type { ReagentFormData } from '@/types';
import {
  getSuppliers,
  getReagentCatalog,
  type Supplier,
  type ReagentCatalogItem,
} from '@/lib/tauri';

interface BulkAddFormProps {
  onSave: (reagents: ReagentFormData[]) => void;
  onCancel: () => void;
}

interface BulkRow extends ReagentFormData {
  _supplierId?: number;
  _catalogItems?: ReagentCatalogItem[];
}

const emptyRow = (): BulkRow => ({
  name: '',
  category: 'reagents',
  expiryDate: '',
  lotNumber: '',
  notes: '',
  manufacturer: '',
  description: '',
});

export function BulkAddForm({ onSave, onCancel }: BulkAddFormProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BulkRow[]>([
    emptyRow(),
    emptyRow(),
    emptyRow(),
    emptyRow(),
  ]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    getSuppliers()
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  const handleSupplierChange = useCallback(
    async (index: number, supplierId: number | undefined) => {
      const updated = [...rows];
      updated[index] = {
        ...updated[index],
        _supplierId: supplierId,
        _catalogItems: undefined,
        // Reset reagent selection when supplier changes
        name: '',
        supplier_id: undefined,
        supplier_name: undefined,
      };
      setRows(updated);

      if (supplierId) {
        try {
          const items = await getReagentCatalog(supplierId);
          setRows((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], _catalogItems: items };
            return next;
          });
        } catch {
          // ignore — catalog stays empty
        }
      }
    },
    [rows],
  );

  const handleReagentSelect = useCallback(
    (index: number, catalogItemId: number | undefined) => {
      setRows((prev) => {
        const next = [...prev];
        const row = next[index];
        if (!catalogItemId) {
          next[index] = {
            ...row,
            name: '',
            supplier_id: undefined,
            supplier_name: undefined,
          };
          return next;
        }
        const catalogItem = row._catalogItems?.find((c) => c.id === catalogItemId);
        const supplier = suppliers.find((s) => s.id === row._supplierId);
        if (catalogItem) {
          next[index] = {
            ...row,
            name: catalogItem.name,
            supplier_id: supplier?.id,
            supplier_name: supplier?.name,
          };
        }
        return next;
      });
    },
    [suppliers],
  );

  const updateField = (index: number, field: keyof ReagentFormData, value: string | number | undefined) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleSave = () => {
    const validReagents: ReagentFormData[] = rows
      .filter((r) => r.name && r.expiryDate)
      .map(({ _supplierId: _, _catalogItems: __, ...formData }) => formData);
    if (validReagents.length > 0) {
      onSave(validReagents);
    }
  };

  const isValid = rows.some((r) => r.name && r.expiryDate);

  return (
    <div className="space-y-4 p-6 bg-muted/30 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {t('dashboard.addMultiple')}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t('actions.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isValid}>
            <Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t('actions.save')}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-7 gap-3 p-4 bg-background border rounded-lg"
          >
            {/* Supplier dropdown */}
            <div>
              <Select
                value={row._supplierId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  handleSupplierChange(index, val);
                }}
              >
                <option value="">{t('catalog.selectSupplier')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Reagent dropdown (populated after supplier selected) */}
            <div>
              <Select
                value={
                  row._catalogItems?.find((c) => c.name === row.name)?.id ?? ''
                }
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  handleReagentSelect(index, val);
                }}
                disabled={!row._supplierId || !row._catalogItems?.length}
              >
                <option value="">{t('catalog.selectReagent')}</option>
                {(row._catalogItems ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.catalog_number ? ` (${item.catalog_number})` : ''}
                  </option>
                ))}
              </Select>
            </div>

            {/* Expiry date */}
            <div>
              <DateInput
                value={row.expiryDate}
                onChange={(e) => updateField(index, 'expiryDate', e.target.value)}
                placeholderText={t('form.expiryDatePlaceholder')}
              />
            </div>

            {/* Lot number */}
            <div>
              <Input
                placeholder={t('form.lotNumber')}
                value={row.lotNumber}
                onChange={(e) => updateField(index, 'lotNumber', e.target.value)}
              />
            </div>

            {/* Quantity */}
            <div>
              <Input
                type="number"
                min={0}
                placeholder={t('newShipment.quantity')}
                value={row.quantity ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  updateField(index, 'quantity', val);
                }}
              />
            </div>

            {/* Manufacturer */}
            <div>
              <Input
                placeholder={t('form.manufacturer')}
                value={row.manufacturer ?? ''}
                onChange={(e) => updateField(index, 'manufacturer', e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <Textarea
                placeholder={t('form.description')}
                value={row.description ?? ''}
                onChange={(e) => updateField(index, 'description', e.target.value)}
                rows={1}
                className="resize-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
