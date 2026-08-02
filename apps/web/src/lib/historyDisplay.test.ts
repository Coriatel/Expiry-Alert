import { describe, expect, it } from "vitest";
import {
  getDestructionDisplayEntries,
  getDuplicationDisplayEntries,
} from "./historyDisplay";

describe("history display result parity", () => {
  it("applies the destruction filter and sort once for cards and tables", () => {
    const entries = [
      { id: 1, quantity_destroyed: 0, reagent_name: "A" },
      { id: 2, quantity_destroyed: 2, reagent_name: "C" },
      { id: 3, quantity_destroyed: 1, reagent_name: "B" },
    ];

    const displayEntries = getDestructionDisplayEntries(
      entries,
      true,
      "reagent_name",
      "asc",
    );

    expect(displayEntries.map(({ id }) => id)).toEqual([3, 2]);
    expect(entries.map(({ id }) => id)).toEqual([1, 2, 3]);
  });

  it("sorts duplication records without mutating the API result", () => {
    const entries = [
      { id: 4, quantity: 0, received_date: "2026-08-01" },
      { id: 5, quantity: 2, received_date: "2026-08-02" },
    ];

    const displayEntries = getDuplicationDisplayEntries(
      entries,
      "received_date",
      "desc",
    );

    expect(displayEntries.map(({ id }) => id)).toEqual([5, 4]);
    expect(entries.map(({ id }) => id)).toEqual([4, 5]);
  });
});
