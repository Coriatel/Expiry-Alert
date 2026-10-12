import { describe, expect, it } from "vitest";
import { searchReagents } from "./utils";
import type { Reagent } from "@/types";

const make = (over: Partial<Reagent>): Reagent => ({
  id: 1,
  name: "Anti-D",
  category: "reagents",
  expiry_date: "2026-12-01",
  is_archived: false,
  ...over,
});

const items = [
  make({ id: 1, name: "Anti-D Blend", lot_number: "LOT-A100" }),
  make({ id: 2, name: "בקרת איכות", lot_number: "QC-77", manufacturer: "Bio-Rad" }),
  make({ id: 3, name: "Panel", lot_number: undefined, supplier_name: "Diagast" }),
];

const ids = (list: Reagent[]) => list.map((r) => r.id);

describe("searchReagents", () => {
  it("matches by name", () => {
    expect(ids(searchReagents(items, "blend"))).toEqual([1]);
    expect(ids(searchReagents(items, "איכות"))).toEqual([2]);
  });

  it("matches by lot number", () => {
    expect(ids(searchReagents(items, "qc-7"))).toEqual([2]);
  });

  it("matches manufacturer and supplier names", () => {
    expect(ids(searchReagents(items, "bio-rad"))).toEqual([2]);
    expect(ids(searchReagents(items, "diagast"))).toEqual([3]);
  });

  it("is case-insensitive", () => {
    expect(ids(searchReagents(items, "LOT-a100"))).toEqual([1]);
  });

  it("trims the query", () => {
    expect(ids(searchReagents(items, "  lot-a100  "))).toEqual([1]);
  });

  it("returns everything for an empty or blank query", () => {
    expect(searchReagents(items, "")).toBe(items);
    expect(searchReagents(items, "   ")).toBe(items);
  });

  it("returns nothing when there is no match", () => {
    expect(searchReagents(items, "zzz")).toEqual([]);
  });
});
