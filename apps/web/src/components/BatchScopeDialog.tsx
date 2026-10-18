import { useTranslation } from "react-i18next";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";

export type BatchScope = "one" | "all";

interface BatchScopeDialogProps {
  open: boolean;
  name: string;
  otherCount: number;
  onChoose: (scope: BatchScope | null) => void;
}

export function BatchScopeDialog({ open, name, otherCount, onChoose }: BatchScopeDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={() => onChoose(null)} className="max-w-sm">
      <div className="flex flex-col text-center">
        <h3 className="mb-2 text-lg font-semibold">{t("batchScope.title")}</h3>
        <p className="mb-5 text-sm text-muted-foreground">
          {t("batchScope.message", { name, count: otherCount })}
        </p>
        <div className="flex flex-col gap-2">
          <Button className="min-h-11" onClick={() => onChoose("all")}>
            {t("batchScope.all", { count: otherCount === 1 ? 1 : otherCount + 1 })}
          </Button>
          <Button variant="outline" className="min-h-11" onClick={() => onChoose("one")}>
            {t("batchScope.one")}
          </Button>
          <Button variant="ghost" className="min-h-11" onClick={() => onChoose(null)}>
            {t("batchScope.back")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
