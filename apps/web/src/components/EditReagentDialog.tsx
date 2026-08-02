import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { getSuppliers, type Supplier } from "@/lib/tauri";
import type { Reagent, ReagentFormData } from "@/types";

const MAX_QUANTITY = 1_000_000;

interface EditReagentDialogProps {
  reagent: Reagent | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: number, data: ReagentFormData) => Promise<void>;
}

function getPrivateError(error: unknown, t: (key: string) => string): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (code === "STALE_ITEM") return t("errors.itemStale");
  if (code === "ITEM_NOT_FOUND") return t("errors.itemUnavailable");
  if (code === "INVALID_ITEM") return t("errors.invalidItem");
  return t("errors.updateFailed");
}

const emptyForm = (): ReagentFormData => ({
  name: "",
  category: "reagents",
  expiryDate: "",
  receivedDate: "",
  lotNumber: "",
  notes: "",
  supplier_id: undefined,
  supplier_name: undefined,
  quantity: null,
  manufacturer: "",
  description: "",
});

export function EditReagentDialog({
  reagent,
  open,
  onClose,
  onSave,
}: EditReagentDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quantityInput, setQuantityInput] = useState("");
  const [formData, setFormData] = useState<ReagentFormData>(emptyForm);

  useEffect(() => {
    if (!open) return;
    getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, [open]);

  useEffect(() => {
    if (!reagent) return;
    setFormData({
      name: reagent.name,
      category: reagent.category ?? "reagents",
      expiryDate: reagent.expiry_date,
      receivedDate: reagent.received_date ?? "",
      lotNumber: reagent.lot_number ?? "",
      notes: reagent.notes ?? "",
      supplier_id: reagent.supplier_id ?? undefined,
      supplier_name: reagent.supplier_name ?? undefined,
      quantity: reagent.quantity ?? null,
      manufacturer: reagent.manufacturer ?? "",
      description: reagent.description ?? "",
    });
    setQuantityInput(
      reagent.quantity == null ? "" : String(reagent.quantity),
    );
    setError(null);
  }, [reagent]);

  const supplierOptions = useMemo(() => {
    if (
      !reagent?.supplier_id ||
      !reagent.supplier_name ||
      suppliers.some((supplier) => supplier.id === reagent.supplier_id)
    ) {
      return suppliers;
    }
    return [
      ...suppliers,
      {
        id: reagent.supplier_id,
        team: reagent.team_id ?? 0,
        name: reagent.supplier_name,
        is_active: true,
      },
    ];
  }, [reagent, suppliers]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reagent) return;

    if (!formData.name.trim()) {
      setError(t("validation.nameRequired"));
      return;
    }
    if (!formData.expiryDate) {
      setError(t("validation.expiryDateRequired"));
      return;
    }

    const normalizedQuantity = quantityInput.trim();
    const quantity =
      normalizedQuantity === "" ? null : Number(normalizedQuantity);
    if (
      quantity !== null &&
      (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY)
    ) {
      setError(t("validation.invalidQuantity"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(reagent.id, { ...formData, quantity });
      onClose();
    } catch (saveError) {
      setError(getPrivateError(saveError, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextChange = (
    field: keyof ReagentFormData,
    value: string,
  ) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setError(null);
  };

  const handleSupplierChange = (value: string) => {
    const supplierId = value ? Number(value) : undefined;
    const supplier = supplierOptions.find((option) => option.id === supplierId);
    setFormData((previous) => ({
      ...previous,
      supplier_id: supplier?.id,
      supplier_name: supplier?.name,
    }));
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("dialog.editItem")}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="edit-item-name" className="mb-1 block text-sm font-medium">
              {t("form.name")} *
            </label>
            <Input
              id="edit-item-name"
              value={formData.name}
              onChange={(event) => handleTextChange("name", event.target.value)}
              placeholder={t("form.namePlaceholder")}
              dir="auto"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-item-category" className="mb-1 block text-sm font-medium">
              {t("form.category")} *
            </label>
            <Select
              id="edit-item-category"
              value={formData.category}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  category: event.target.value as "reagents" | "beads",
                }))
              }
            >
              <option value="reagents">{t("category.reagents")}</option>
              <option value="beads">{t("category.beads")}</option>
            </Select>
          </div>

          <div>
            <label htmlFor="edit-item-expiry" className="mb-1 block text-sm font-medium">
              {t("form.expiryDate")} *
            </label>
            <DateInput
              id="edit-item-expiry"
              value={formData.expiryDate}
              onChange={(event) =>
                handleTextChange("expiryDate", event.target.value)
              }
              placeholderText={t("form.expiryDatePlaceholder")}
              required
            />
          </div>

          <div>
            <label htmlFor="edit-item-received" className="mb-1 block text-sm font-medium">
              {t("form.receivedDate")}
            </label>
            <DateInput
              id="edit-item-received"
              value={formData.receivedDate ?? ""}
              onChange={(event) =>
                handleTextChange("receivedDate", event.target.value)
              }
              placeholderText={t("form.expiryDatePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="edit-item-supplier" className="mb-1 block text-sm font-medium">
              {t("form.supplier")}
            </label>
            <Select
              id="edit-item-supplier"
              value={formData.supplier_id ?? ""}
              onChange={(event) => handleSupplierChange(event.target.value)}
            >
              <option value="">{t("form.noSupplier")}</option>
              {supplierOptions.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="edit-item-lot" className="mb-1 block text-sm font-medium">
              {t("form.lotNumber")}
            </label>
            <Input
              id="edit-item-lot"
              value={formData.lotNumber ?? ""}
              onChange={(event) =>
                handleTextChange("lotNumber", event.target.value)
              }
              placeholder={t("form.lotNumberPlaceholder")}
              dir="auto"
            />
          </div>

          <div>
            <label htmlFor="edit-item-quantity" className="mb-1 block text-sm font-medium">
              {t("newShipment.quantity")}
            </label>
            <Input
              id="edit-item-quantity"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_QUANTITY}
              step={1}
              value={quantityInput}
              onChange={(event) => {
                setQuantityInput(event.target.value);
                setError(null);
              }}
            />
          </div>

          <div>
            <label htmlFor="edit-item-manufacturer" className="mb-1 block text-sm font-medium">
              {t("form.manufacturer")}
            </label>
            <Input
              id="edit-item-manufacturer"
              value={formData.manufacturer ?? ""}
              onChange={(event) =>
                handleTextChange("manufacturer", event.target.value)
              }
              placeholder={t("form.manufacturerPlaceholder")}
              dir="auto"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="edit-item-description" className="mb-1 block text-sm font-medium">
              {t("form.description")}
            </label>
            <Textarea
              id="edit-item-description"
              value={formData.description ?? ""}
              onChange={(event) =>
                handleTextChange("description", event.target.value)
              }
              placeholder={t("form.descriptionPlaceholder")}
              rows={2}
              dir="auto"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="edit-item-notes" className="mb-1 block text-sm font-medium">
              {t("form.notes")}
            </label>
            <Textarea
              id="edit-item-notes"
              value={formData.notes ?? ""}
              onChange={(event) => handleTextChange("notes", event.target.value)}
              placeholder={t("form.notesPlaceholder")}
              rows={3}
              dir="auto"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11"
          >
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-h-11">
            {isSubmitting ? t("actions.saving") : t("actions.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
