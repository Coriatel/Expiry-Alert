import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { getSuppliers, type Supplier } from "@/lib/tauri";
import { normalizeReagentCategory } from "@/lib/reagentCategory";
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [formData, setFormData] = useState<ReagentFormData>({
    name: "",
    category: "reagents",
    expiryDate: "",
    lotNumber: "",
    notes: "",
    manufacturer: "",
    description: "",
  });

  useEffect(() => {
    if (reagent) {
      setFormData({
        name: reagent.name,
        category: normalizeReagentCategory(reagent.category),
        expiryDate: "",
        lotNumber: "",
        notes: reagent.notes || "",
        supplier_name: reagent.supplier_name ?? undefined,
        supplier_id: reagent.supplier_id ?? undefined,
        quantity: reagent.quantity != null ? Number(reagent.quantity) : undefined,
        manufacturer: reagent.manufacturer || "",
        description: reagent.description || "",
      });
      setError(null);
    }
  }, [reagent]);

  useEffect(() => {
    if (!open) return;

    getSuppliers()
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const handleChange = (field: keyof ReagentFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const supplierOptions = [...suppliers];
  const hasLegacySupplier =
    !!formData.supplier_name &&
    !suppliers.some((supplier) => supplier.id === formData.supplier_id) &&
    !suppliers.some((supplier) => supplier.name === formData.supplier_name);

  if (hasLegacySupplier) {
    supplierOptions.unshift({
      id: -1,
      team: 0,
      name: formData.supplier_name!,
      short_code: null,
      is_active: false,
    });
  }

  const supplierValue =
    formData.supplier_id != null
      ? String(formData.supplier_id)
      : hasLegacySupplier && formData.supplier_name
        ? `legacy:${formData.supplier_name}`
        : "";

  const handleSupplierChange = (value: string) => {
    if (!value) {
      setFormData((prev) => ({
        ...prev,
        supplier_id: undefined,
        supplier_name: undefined,
      }));
      setError(null);
      return;
    }

    if (value.startsWith("legacy:")) {
      const legacyName = value.slice("legacy:".length);
      setFormData((prev) => ({
        ...prev,
        supplier_id: undefined,
        supplier_name: legacyName || undefined,
      }));
      setError(null);
      return;
    }

    const supplierId = Number(value);
    const supplier = suppliers.find((item) => item.id === supplierId);
    setFormData((prev) => ({
      ...prev,
      supplier_id: supplier?.id,
      supplier_name: supplier?.name,
    }));
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("newShipment.title")}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Reagent name — read-only */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              {t("form.name")}
            </label>
            <div className="px-3 py-2 rounded-md border bg-muted/50 text-sm">
              {reagent?.name ?? ""}
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              {t("catalog.supplier")}
            </label>
            <Select
              aria-label={t("catalog.supplier")}
              value={supplierValue}
              onChange={(e) => handleSupplierChange(e.target.value)}
            >
              <option value="">{t("catalog.selectSupplier")}</option>
              {supplierOptions.map((supplier) => (
                <option
                  key={
                    supplier.id > 0 ? String(supplier.id) : `legacy:${supplier.name}`
                  }
                  value={
                    supplier.id > 0 ? String(supplier.id) : `legacy:${supplier.name}`
                  }
                >
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Lot number — empty, user must enter */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("newShipment.lotNumber")}
            </label>
            <Input
              value={formData.lotNumber ?? ""}
              onChange={(e) => handleChange("lotNumber", e.target.value)}
              placeholder={t("form.lotNumberPlaceholder")}
            />
          </div>

          {/* Expiry date — empty, user must enter */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("newShipment.expiryDate")} *
            </label>
            <DateInput
              value={formData.expiryDate}
              onChange={(e) => handleChange("expiryDate", e.target.value)}
              placeholderText={t("form.expiryDatePlaceholder")}
              required
            />
          </div>

          {/* Quantity — pre-filled from original */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("newShipment.quantity")}
            </label>
            <Input
              type="number"
              min={0}
              value={formData.quantity ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? undefined : Number(e.target.value);
                setFormData((prev) => ({ ...prev, quantity: val }));
                setError(null);
              }}
            />
            <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "#2d6a4f" }}>
              <HelpCircle className="h-4 w-4" />
              {t("newShipment.sameQuantity")}
            </p>
          </div>

          {/* Manufacturer — pre-filled, editable */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("form.manufacturer")}
            </label>
            <Input
              value={formData.manufacturer ?? ""}
              onChange={(e) => handleChange("manufacturer", e.target.value)}
              placeholder={t("form.manufacturerPlaceholder")}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              {t("form.description")}
            </label>
            <Textarea
              value={formData.description ?? ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
              rows={2}
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
