import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReagentCard } from "./ReagentCard";
import type { Reagent } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const reagent: Reagent = {
  id: 1,
  name: "Anti-Human CD45 Pacific Blue Monoclonal Antibody Clone HI30 Research Use Only",
  category: "reagents",
  expiry_date: "2026-12-31",
  received_date: "2026-01-15",
  supplier_name: "Long English Supplier Organization",
  lot_number: "LONG-LOT-1",
  quantity: 0,
  is_archived: false,
};

describe("ReagentCard", () => {
  it("keeps mixed-direction content safe and all actions named with 44px targets", () => {
    render(
      <ReagentCard
        reagent={reagent}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.getByText(reagent.name)).toHaveAttribute("dir", "auto");
    expect(screen.getByText(reagent.supplier_name!)).toHaveAttribute("dir", "auto");
    for (const label of [
      "table.selectItem",
      "actions.edit",
      "actions.duplicate",
      "actions.destroy",
      "actions.delete",
    ]) {
      expect(screen.getByRole("button", { name: label })).toHaveClass("h-11");
    }
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("form.receivedDate")).toBeInTheDocument();
  });
});
