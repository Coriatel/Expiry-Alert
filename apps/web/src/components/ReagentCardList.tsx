import { useTranslation } from "react-i18next";
import { CheckSquare, Square } from "lucide-react";
import { ReagentCard } from "@/components/ReagentCard";
import type { Reagent } from "@/types";

interface ReagentCardListProps {
  reagents: Reagent[];
  onEdit: (reagent: Reagent) => void;
  onDuplicate?: (reagent: Reagent) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onToggleInTreatment?: (id: number, value: boolean) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
}

export function ReagentCardList({
  reagents,
  onEdit,
  onDuplicate,
  onDelete,
  onArchive,
  onToggleInTreatment,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: ReagentCardListProps) {
  const { t } = useTranslation();

  if (reagents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("dashboard.noReagents")}
      </div>
    );
  }

  return (
    <div className="cards-view space-y-2">
      {/* Select all */}
      <button
        onClick={onSelectAll}
        className="-my-1 flex min-h-11 items-center gap-2 rounded px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("table.selectAll")}
      >
        {selectedIds.length === reagents.length && reagents.length > 0 ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
        {t("table.selectAll")}
      </button>

      {/* Cards */}
      {reagents.map((reagent) => (
        <ReagentCard
          key={reagent.id}
          reagent={reagent}
          isSelected={selectedIds.includes(reagent.id)}
          onToggleSelect={onToggleSelect}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onArchive={onArchive}
          onToggleInTreatment={onToggleInTreatment}
        />
      ))}
    </div>
  );
}
