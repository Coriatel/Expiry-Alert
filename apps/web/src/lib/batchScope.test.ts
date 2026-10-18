import { describe, expect, it } from "vitest";
import type { Reagent } from "@expiry-alert/shared";
import { otherBatches, reagentToForm, sharedChanges } from "./batchScope";

const base: Reagent = {
  id: 1,
  name: "Panel 6",
  category: "reagents",
  expiry_date: "2026-10-12",
  lot_number: "132016551",
  is_archived: false,
  quantity: 1,
  manufacturer: "Biorad",
  description: "פנל עזר",
  notes: "",
};

describe("batch scope", () => {
  it("finds other active batches of the same reagent, ignoring case and spaces", () => {
    const all: Reagent[] = [
      base,
      { ...base, id: 2, name: " panel 6", lot_number: "999" },
      { ...base, id: 3, lot_number: "888", is_archived: true },
      { ...base, id: 4, name: "Panel 5" },
    ];
    expect(otherBatches(all, base).map((r) => r.id)).toEqual([2]);
  });

  it("reports reagent-level and quantity changes but not batch-only fields", () => {
    const form = reagentToForm(base);
    expect(sharedChanges(base, form)).toEqual({});
    expect(
      sharedChanges(base, {
        ...form,
        notes: "יגיע מחר",
        expiryDate: "2027-01-01",
        lotNumber: "1",
        receivedDate: "2026-10-18",
      }),
    ).toEqual({});
    expect(sharedChanges(base, { ...form, quantity: 3, description: "חדש" })).toEqual({
      quantity: 3,
      description: "חדש",
    });
  });

  it("treats empty text and a missing value as the same", () => {
    const noManufacturer = { ...base, manufacturer: null };
    expect(sharedChanges(noManufacturer, { ...reagentToForm(noManufacturer), manufacturer: "" })).toEqual({});
  });
});
