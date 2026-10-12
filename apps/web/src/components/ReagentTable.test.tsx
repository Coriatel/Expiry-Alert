import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReagentTable } from "./ReagentTable";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ReagentTable", () => {
  it("applies className to the empty state so a print-only table stays hidden on screen", () => {
    render(
      <ReagentTable
        reagents={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
        selectedIds={[]}
        onToggleSelect={vi.fn()}
        onSelectAll={vi.fn()}
        className="hidden print:block"
      />,
    );

    expect(screen.getByText("dashboard.noReagents")).toHaveClass("hidden", "print:block");
  });
});
