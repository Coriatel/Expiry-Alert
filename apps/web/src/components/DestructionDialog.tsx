import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Reagent } from "@/types";

interface DestructionDialogProps {
  reagent: Reagent | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (reagentId: number, quantityDestroyed: number) => Promise<void>;
}

export function DestructionDialog({
  reagent,
  open,
  onClose,
  onConfirm,
}: DestructionDialogProps) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset quantity when reagent changes
  useEffect(() => {
    if (reagent) {
      setQuantity(reagent.quantity ?? 0);
    }
  }, [reagent]);

  const handleConfirm = async (destroyedCount: number) => {
    if (!reagent || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reagent.id, destroyedCount);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("destruction.title")}
      className="max-w-md"
    >
      <div className="space-y-5">
        {/* Reagent name */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Flame className="h-5 w-5 text-orange-600" />
          </div>
          <span className="text-lg font-semibold">{reagent?.name}</span>
        </div>

        {/* Question text */}
        <p className="text-sm text-muted-foreground">
          {t("destruction.question")}
        </p>

        {/* Quantity input */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("destruction.unitsDestroyed")}
          </label>
          <Input
            type="number"
            min={0}
            value={quantity}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleConfirm(quantity);
              }
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleConfirm(0)}
            disabled={isSubmitting}
          >
            {t("destruction.noneDestroyed")}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => handleConfirm(quantity)}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("actions.processing") : t("destruction.confirm")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
