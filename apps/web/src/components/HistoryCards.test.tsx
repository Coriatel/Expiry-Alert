import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DestructionHistoryCards,
  DuplicationHistoryCards,
} from "./HistoryCards";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("HistoryCards", () => {
  it("renders every destruction record with existing source fields and actions", () => {
    const entries = [
      {
        id: 1,
        team: 7,
        reagent_name: "Long English Item Name That Must Wrap Safely",
        supplier_name: "Supplier One",
        lot_number: "LOT-1",
        expiry_date: "2026-12-31",
        quantity_original: 0,
        quantity_destroyed: 0,
        destroyed_by_name: "Operator",
        destruction_date: "2026-08-02T10:00:00.000Z",
      },
    ];

    render(
      <DestructionHistoryCards
        entries={entries}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId("history-card")).toHaveLength(entries.length);
    expect(screen.getByText(entries[0].reagent_name)).toHaveAttribute("dir", "auto");
    expect(screen.getAllByText("0", { selector: "dd" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "actions.edit" })).toHaveClass("h-11");
    expect(screen.getByRole("button", { name: "actions.delete" })).toHaveClass("h-11");
  });

  it("renders the same duplication result set including zero quantity", () => {
    const entries = [
      {
        id: 2,
        team: 7,
        reagent_name: "פריט בדיקה",
        supplier_name: "Supplier Two",
        lot_number: "LOT-2",
        expiry_date: "2027-01-01",
        quantity: 0,
        received_by_name: "Operator",
        received_date: "2026-08-02T11:00:00.000Z",
      },
    ];

    render(
      <DuplicationHistoryCards
        entries={entries}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId("history-card")).toHaveLength(entries.length);
    expect(screen.getByText(entries[0].reagent_name)).toBeInTheDocument();
    expect(screen.getByText("0", { selector: "dd" })).toBeInTheDocument();
  });
});
