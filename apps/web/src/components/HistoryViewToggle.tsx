import { LayoutGrid, LayoutList } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

export type HistoryViewMode = "table" | "cards";

interface HistoryViewToggleProps {
  value: HistoryViewMode;
  onChange: (value: HistoryViewMode) => void;
}
export function HistoryViewToggle({
  value,
  onChange,
}: HistoryViewToggleProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t("history.displayMode")}
    >
      <Button
        type="button"
        variant={value === "table" ? "default" : "outline"}
        onClick={() => onChange("table")}
        className="h-11 w-11 p-0"
        aria-label={t("dashboard.viewTable")}
        aria-pressed={value === "table"}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={value === "cards" ? "default" : "outline"}
        onClick={() => onChange("cards")}
        className="h-11 w-11 p-0"
        aria-label={t("dashboard.viewCards")}
        aria-pressed={value === "cards"}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
