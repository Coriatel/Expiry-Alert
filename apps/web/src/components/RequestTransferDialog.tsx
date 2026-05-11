import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { createTransferRequest } from "@/lib/tauri";
import type { TeamSummary } from "@/lib/tauri";

interface RequestTransferDialogProps {
  open: boolean;
  onClose: () => void;
  teams: TeamSummary[];
  onSent?: () => void;
}

export function RequestTransferDialog({
  open,
  onClose,
  teams,
  onSent,
}: RequestTransferDialogProps) {
  const { t } = useTranslation();
  const [toTeam, setToTeam] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setToTeam("");
    setMessage("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (toTeam === "") return;
    setBusy(true);
    setError("");
    try {
      await createTransferRequest(Number(toTeam), message.trim() || undefined);
      reset();
      onSent?.();
      onClose();
    } catch {
      setError(
        t("transferRequests.sendError", {
          defaultValue: "שליחת הבקשה נכשלה",
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t("transferRequests.dialogTitle", {
        defaultValue: "בקשת פריטים מצוות אחר",
      })}
      className="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("transferRequests.targetTeam", { defaultValue: "צוות יעד" })} *
          </label>
          <Select
            value={toTeam}
            onChange={(e) =>
              setToTeam(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">
              {t("transferRequests.selectTeam", {
                defaultValue: "בחר/י צוות",
              })}
            </option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t("transferRequests.messageLabel", {
              defaultValue: "מה צריך? (אופציונלי)",
            })}
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("transferRequests.messagePlaceholder", {
              defaultValue: "לדוגמה: 5 יחידות X שפג להן השבוע",
            })}
            rows={3}
            maxLength={2000}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={busy || toTeam === ""}>
            {busy
              ? t("actions.processing", { defaultValue: "שולח..." })
              : t("transferRequests.send", { defaultValue: "שלח בקשה" })}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
