import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HistoryViewToggle } from "./HistoryViewToggle";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("HistoryViewToggle", () => {
  it("exposes named 44px table and card choices", () => {
    const onChange = vi.fn();
    render(<HistoryViewToggle value="cards" onChange={onChange} />);

    const table = screen.getByRole("button", { name: "dashboard.viewTable" });
    const cards = screen.getByRole("button", { name: "dashboard.viewCards" });
    expect(table.className).toContain("h-11");
    expect(cards.className).toContain("h-11");
    expect(cards).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(table);
    expect(onChange).toHaveBeenCalledWith("table");
  });
});
