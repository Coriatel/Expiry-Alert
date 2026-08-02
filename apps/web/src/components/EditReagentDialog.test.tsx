import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditReagentDialog } from "./EditReagentDialog";
import type { Reagent } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he" },
  }),
}));

vi.mock("@/lib/tauri", () => ({
  getSuppliers: vi.fn(() => new Promise(() => {})),
}));

const baseReagent: Reagent = {
  id: 1,
  name: "Test Reagent",
  category: "reagents",
  expiry_date: "2026-12-01",
  is_archived: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  lot_number: "LOT123",
  notes: "some notes",
  manufacturer: "BIORAD",
  description: "QC beads for quality control",
  supplier_id: 44,
  supplier_name: "Existing Supplier",
  quantity: 0,
  received_date: "2026-01-15",
};

describe("EditReagentDialog — manufacturer & description", () => {
  it("renders manufacturer and description inputs pre-filled from reagent", () => {
    render(
      <EditReagentDialog
        reagent={baseReagent}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const manufacturerInput = screen.getByPlaceholderText(
      "form.manufacturerPlaceholder",
    );
    const descriptionInput = screen.getByPlaceholderText(
      "form.descriptionPlaceholder",
    );

    expect((manufacturerInput as HTMLInputElement).value).toBe("BIORAD");
    expect((descriptionInput as HTMLTextAreaElement).value).toBe(
      "QC beads for quality control",
    );
  });

  it("includes manufacturer and description in the save payload", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditReagentDialog
        reagent={baseReagent}
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const manufacturerInput = screen.getByPlaceholderText(
      "form.manufacturerPlaceholder",
    );
    fireEvent.change(manufacturerInput, { target: { value: "SIGMA" } });

    const descriptionInput = screen.getByPlaceholderText(
      "form.descriptionPlaceholder",
    );
    fireEvent.change(descriptionInput, { target: { value: "Updated description" } });

    const saveButton = screen.getByText("actions.save");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          manufacturer: "SIGMA",
          description: "Updated description",
        }),
      );
    });
  });

  it("uses item terminology and exposes quantity, supplier and received date", () => {
    render(
      <EditReagentDialog
        reagent={baseReagent}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "dialog.editItem" })).toBeInTheDocument();
    expect(screen.getByLabelText("newShipment.quantity")).toHaveValue(0);
    expect(screen.getByLabelText("form.receivedDate")).toHaveValue("2026-01-15");
    expect(screen.getByLabelText("form.supplier")).toHaveValue("44");
  });

  it("preserves zero, converts a blank quantity to null and blocks invalid input", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <EditReagentDialog
        reagent={baseReagent}
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByText("actions.save"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ quantity: 0 }),
      );
    });

    onSave.mockClear();
    rerender(
      <EditReagentDialog
        reagent={{ ...baseReagent, id: 2, quantity: null }}
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText("actions.save"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ quantity: null }),
      );
    });

    onSave.mockClear();
    fireEvent.change(screen.getByLabelText("newShipment.quantity"), {
      target: { value: "-1" },
    });
    fireEvent.click(screen.getByText("actions.save"));
    expect(await screen.findByText("validation.invalidQuantity")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
