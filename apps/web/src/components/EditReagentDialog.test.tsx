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
});
