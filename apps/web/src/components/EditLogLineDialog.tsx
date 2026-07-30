import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Textarea } from "@/components/ui/Textarea";

export type LogFieldType = "text" | "number" | "date" | "textarea";

export interface LogField {
  key: string;
  label: string;
  type: LogFieldType;
}

interface EditLogLineDialogProps<T> {
  entry: T | null;
  open: boolean;
  title: string;
  fields: LogField[];
  onClose: () => void;
  onSave: (id: number, data: Record<string, unknown>) => Promise<void>;
}

/// Shared line editor for the destruction / duplication history tables.
/// Fields are declared per page so each table edits only its own columns.
export function EditLogLineDialog<T extends { id: number }>({
  entry,
  open,
  title,
  fields,
  onClose,
  onSave,
}: EditLogLineDialogProps<T>) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    const next: Record<string, string> = {};
    for (const f of fields) {
      const raw = (entry as Record<string, unknown>)[f.key];
      // Dates arrive as ISO timestamps; the date input needs YYYY-MM-DD.
      next[f.key] =
        raw == null
          ? ""
          : f.type === "date"
            ? String(raw).slice(0, 10)
            : String(raw);
    }
    setValues(next);
    setError(null);
  }, [entry, fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;

    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.key] ?? "";
      if (f.type === "number") {
        if (v.trim() === "") {
          payload[f.key] = null;
          continue;
        }
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          setError(t("validation.invalidQuantity", { defaultValue: "Invalid quantity" }));
          return;
        }
        payload[f.key] = n;
      } else {
        payload[f.key] = v.trim() === "" ? null : v;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(entry.id, payload);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("errors.saveFailed", { defaultValue: "Save failed" }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-sm font-medium" htmlFor={`log-${f.key}`}>
              {f.label}
            </label>
            {f.type === "date" ? (
              <DateInput
                id={`log-${f.key}`}
                placeholderText={f.label}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              />
            ) : f.type === "textarea" ? (
              <Textarea
                id={`log-${f.key}`}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              />
            ) : (
              <Input
                id={`log-${f.key}`}
                type={f.type === "number" ? "number" : "text"}
                inputMode={f.type === "number" ? "decimal" : undefined}
                min={f.type === "number" ? 0 : undefined}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("actions.saving", { defaultValue: "Saving..." })
              : t("actions.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
