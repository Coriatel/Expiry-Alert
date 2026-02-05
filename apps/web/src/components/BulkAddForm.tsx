import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DateInput } from '@/components/ui/DateInput';
import { Select } from '@/components/ui/Select';
import type { ReagentFormData } from '@/types';

interface BulkAddFormProps {
  onSave: (reagents: ReagentFormData[]) => void;
  onCancel: () => void;
}

const emptyReagent = (): ReagentFormData => ({
  name: '',
  category: 'reagents',
  expiryDate: '',
  lotNumber: '',
  notes: '',
});

export function BulkAddForm({ onSave, onCancel }: BulkAddFormProps) {
  const { t } = useTranslation();
  const [reagents, setReagents] = useState<ReagentFormData[]>([
    emptyReagent(),
    emptyReagent(),
    emptyReagent(),
    emptyReagent(),
  ]);

  const updateReagent = (index: number, field: keyof ReagentFormData, value: string) => {
    const updated = [...reagents];
    updated[index] = { ...updated[index], [field]: value };
    setReagents(updated);
  };

  const handleSave = () => {
    const validReagents = reagents.filter((r) => r.name && r.expiryDate);
    if (validReagents.length > 0) {
      onSave(validReagents);
    }
  };

  const isValid = reagents.some((r) => r.name && r.expiryDate);

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
        {reagents.map((reagent, index) => (
          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-background border rounded-lg"
          >
            <div>
              <Input
                placeholder={t('form.name')}
                value={reagent.name}
                onChange={(e) => updateReagent(index, 'name', e.target.value)}
              />
            </div>
            <div>
              <Select
                value={reagent.category}
                onChange={(e) =>
                  updateReagent(index, 'category', e.target.value as 'reagents' | 'beads')
                }
              >
                <option value="reagents">{t('category.reagents')}</option>
                <option value="beads">{t('category.beads')}</option>
              </Select>
            </div>
            <div>
              <DateInput
                value={reagent.expiryDate}
                onChange={(e) => updateReagent(index, 'expiryDate', e.target.value)}
                placeholderText={t('form.expiryDatePlaceholder')}
              />
            </div>
            <div>
              <Input
                placeholder={t('form.lotNumber')}
                value={reagent.lotNumber}
                onChange={(e) => updateReagent(index, 'lotNumber', e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder={t('form.notes')}
                value={reagent.notes}
                onChange={(e) => updateReagent(index, 'notes', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
