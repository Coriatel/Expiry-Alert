import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import type { Reagent, ReagentFormData } from "@/types";

interface DuplicateReagentDialogProps {
  reagent: Reagent | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: ReagentFormData, originalId: number) => Promise<void>;
}

export function DuplicateReagentDialog({
  reagent,
  open,
  onClose,
  onSave,
}: DuplicateReagentDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ReagentFormData>({
    name: "",
    category: "reagents",
    expiryDate: "",
    lotNumber: "",
    notes: "",
  });

  useEffect(() => {
    if (reagent) {
      setFormData({
        name: reagent.name,
        category: reagent.category ?? "reagents",
        expiryDate: "",
        lotNumber: reagent.lot_number || "",
        notes: reagent.notes || "",
      });
      setError(null);
    }
  }, [reagent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError(t("validation.nameRequired"));
      return;
    }
    if (!formData.expiryDate) {
      setError(t("validation.expiryDateRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(formData, reagent!.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.addFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof ReagentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("dialog.duplicateReagent")}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              {t("form.name")} *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={t("form.namePlaceholder")}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("form.category")} *
            </label>
            <Select
              value={formData.category}
              onChange={(e) =>
                handleChange("category", e.target.value as "reagents" | "beads")
              }
            >
              <option value="reagents">{t("category.reagents")}</option>
              <option value="beads">{t("category.beads")}</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("form.expiryDate")} *
            </label>
            <DateInput
              value={formData.expiryDate}
              onChange={(e) => handleChange("expiryDate", e.target.value)}
              placeholderText={t("form.expiryDatePlaceholder")}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("dialog.duplicateExpiryHint")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("form.lotNumber")}
            </label>
            <Input
              value={formData.lotNumber}
              onChange={(e) => handleChange("lotNumber", e.target.value)}
              placeholder={t("form.lotNumberPlaceholder")}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              {t("form.notes")}
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder={t("form.notesPlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("actions.saving") : t("actions.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
