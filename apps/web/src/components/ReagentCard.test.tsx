import { fireEvent, render, screen } from "@testing-library/react";
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
  description: "Synthetic description",
  is_archived: false,
};

function renderCard() {
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
}

describe("ReagentCard", () => {
  it("shows only name, expiry, duplicate, delete and a details toggle when closed", () => {
    renderCard();

    expect(screen.getByText(reagent.name)).toHaveAttribute("dir", "auto");
    expect(screen.getByText("31.12.2026")).toBeInTheDocument();
    for (const label of [
      "table.selectItem",
      "actions.duplicate",
      "actions.delete",
      "card.showDetails",
    ]) {
      expect(screen.getByRole("button", { name: label })).toHaveClass("h-11");
    }
    expect(screen.getByRole("button", { name: "card.showDetails" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText(reagent.supplier_name!)).toBeNull();
    expect(screen.queryByText(reagent.lot_number!)).toBeNull();
    expect(screen.queryByRole("button", { name: "actions.edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "actions.destroy" })).toBeNull();
  });

  it("opens to every detail and the remaining actions", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "card.showDetails" }));

    expect(screen.getByRole("button", { name: "card.hideDetails" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText(reagent.supplier_name!)).toHaveAttribute("dir", "auto");
    expect(screen.getByText(reagent.lot_number!)).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("form.receivedDate")).toBeInTheDocument();
    expect(screen.getByText("Synthetic description")).toBeInTheDocument();
    for (const label of ["actions.edit", "actions.destroy"]) {
      expect(screen.getByRole("button", { name: label })).toHaveClass("h-11");
    }
  });
});
