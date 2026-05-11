import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { TeamSummary } from "@/lib/tauri";

interface TransferReagentsDialogProps {
  open: boolean;
  onClose: () => void;
  teams: TeamSummary[];
  count: number;
  onPick: (team: TeamSummary) => void;
}

export function TransferReagentsDialog({
  open,
  onClose,
  teams,
  count,
  onPick,
}: TransferReagentsDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("transfer.title", { defaultValue: "העברה לצוות" })}
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("transfer.prompt", {
            count,
            defaultValue: `בחר/י צוות יעד עבור ${count} פריטים שנבחרו:`,
          })}
        </p>

        {teams.length === 0 ? (
          <p className="text-sm">
            {t("transfer.noTeams", {
              defaultValue: "אין צוותים אחרים זמינים להעברה.",
            })}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teams.map((team) => (
              <li key={team.id}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onPick(team)}
                >
                  <Send className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {team.name}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
