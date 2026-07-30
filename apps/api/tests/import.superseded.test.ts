import test from "node:test";
import assert from "node:assert/strict";
import { findSupersededReagent } from "../src/services/reagents.ts";

const base = {
  category: "reagents" as const,
  is_archived: false,
  date_created: "2026-01-01",
  date_updated: "2026-01-01",
  team: 2,
};

test("marks the closest older batch of the same catalog item as superseded", () => {
  const existing = [
    { ...base, id: 1, name: "Immucor Panel", expiry_date: "2026-03-01", catalog_reagent_id: 18 },
    { ...base, id: 2, name: "Immucor Panel", expiry_date: "2026-06-01", catalog_reagent_id: 18 },
  ] as any[];

  const match = findSupersededReagent(existing, {
    name: "Immucor Panel",
    category: "reagents",
    expiry_date: "2026-12-01",
    catalog_reagent_id: 18,
  } as any);

  // closest predecessor wins, not the oldest
  assert.equal(match?.id, 2);
});

test("falls back to name+category when catalog id is absent", () => {
  const existing = [
    { ...base, id: 5, name: "  immucor panel ", expiry_date: "2026-06-01", catalog_reagent_id: null },
  ] as any[];

  const match = findSupersededReagent(existing, {
    name: "Immucor Panel",
    category: "reagents",
    expiry_date: "2026-12-01",
    catalog_reagent_id: null,
  } as any);

  assert.equal(match?.id, 5);
});

test("does not mark anything when the imported batch expires earlier or same day", () => {
  const existing = [
    { ...base, id: 7, name: "Immucor Panel", expiry_date: "2026-06-01", catalog_reagent_id: 18 },
  ] as any[];

  assert.equal(
    findSupersededReagent(existing, {
      name: "Immucor Panel",
      category: "reagents",
      expiry_date: "2026-01-01",
      catalog_reagent_id: 18,
    } as any),
    null,
  );
  assert.equal(
    findSupersededReagent(existing, {
      name: "Immucor Panel",
      category: "reagents",
      expiry_date: "2026-06-01",
      catalog_reagent_id: 18,
    } as any),
    null,
  );
});

test("ignores archived records and different items", () => {
  const existing = [
    { ...base, id: 8, name: "Immucor Panel", expiry_date: "2026-06-01", catalog_reagent_id: 18, is_archived: true },
    { ...base, id: 9, name: "Other Panel", expiry_date: "2026-06-01", catalog_reagent_id: 99 },
    { ...base, id: 10, name: "Immucor Panel", expiry_date: "2026-06-01", catalog_reagent_id: 18, category: "beads" },
  ] as any[];

  assert.equal(
    findSupersededReagent(existing, {
      name: "Immucor Panel",
      category: "reagents",
      expiry_date: "2026-12-01",
      catalog_reagent_id: 18,
    } as any),
    null,
  );
});
