import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DestructionDialog } from "./DestructionDialog";
import type { Reagent } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count == null ? key : `${key}:${options.count}`,
  }),
}));

const reagent = {
  id: 1,
  name: "IH-QC 1",
  category: "reagents",
  expiry_date: "2026-08-03",
  is_archived: false,
  quantity: 3,
} as Reagent;

describe("DestructionDialog", () => {
  it("offers no destroy-all shortcut for a single item", () => {
    render(
      <DestructionDialog reagent={reagent} open onClose={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(screen.queryByText(/destruction\.destroyAll/)).not.toBeInTheDocument();
  });

  it("destroys the whole queue only after a second, confirming click", async () => {
    const onDestroyAll = vi.fn().mockResolvedValue(undefined);
    render(
      <DestructionDialog
        reagent={reagent}
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        queueCount={8}
        onDestroyAll={onDestroyAll}
      />,
    );

    fireEvent.click(screen.getByText("destruction.destroyAll:8"));
    expect(onDestroyAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("destruction.destroyAllConfirm:8"));
    await waitFor(() => expect(onDestroyAll).toHaveBeenCalledTimes(1));
  });
});
