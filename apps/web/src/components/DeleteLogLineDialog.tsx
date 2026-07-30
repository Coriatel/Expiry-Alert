import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface DeleteLogLineDialogProps {
  open: boolean;
  title: string;
  description: string;
  /// Label for the destructive-but-side-effect-free option.
  recordOnlyLabel: string;
  /// Label for the option that also touches the reagent (restore stock / clear dot).
  withSideEffectLabel: string;
  onClose: () => void;
  onConfirm: (withSideEffect: boolean) => Promise<void>;
}

/// Two-way delete confirmation: the owner explicitly chooses whether deleting a
/// history line also changes the reagent, instead of a silent default.
export function DeleteLogLineDialog({
  open,
  title,
  description,
  recordOnlyLabel,
  withSideEffectLabel,
  onClose,
  onConfirm,
}: DeleteLogLineDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (withSideEffect: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(withSideEffect);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("errors.deleteFailed", { defaultValue: "Delete failed" }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2">
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => run(true)}
          >
            {withSideEffectLabel}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => run(false)}>
            {recordOnlyLabel}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            {t("actions.cancel")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
