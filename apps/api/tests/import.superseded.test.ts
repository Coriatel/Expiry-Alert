import test from "node:test";
import assert from "node:assert/strict";
import {
  findSupersededReagent,
  toLoggedQuantity,
} from "../src/services/reagents.ts";

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

test("never overwrites an existing replaced_by pointer (no orphaned history)", () => {
  // A is already superseded by B. Importing C with an expiry BETWEEN A and B
  // must not re-point A at C — that would silently orphan the A->B relationship
  // and contradict the duplication-log row already written for it.
  const existing = [
    { ...base, id: 1, name: "Immucor Panel", expiry_date: "2026-01-01", catalog_reagent_id: 18, replaced_by: 2 },
    { ...base, id: 2, name: "Immucor Panel", expiry_date: "2026-06-01", catalog_reagent_id: 18 },
  ] as any[];

  const match = findSupersededReagent(existing, {
    name: "Immucor Panel",
    category: "reagents",
    expiry_date: "2026-03-01",
    catalog_reagent_id: 18,
  } as any);

  assert.equal(match, null);
});

test("still supersedes the un-superseded batch when an older one is already flagged", () => {
  const existing = [
    { ...base, id: 1, name: "Immucor Panel", expiry_date: "2026-01-01", catalog_reagent_id: 18, replaced_by: 2 },
    { ...base, id: 2, name: "Immucor Panel", expiry_date: "2026-06-01", catalog_reagent_id: 18 },
  ] as any[];

  const match = findSupersededReagent(existing, {
    name: "Immucor Panel",
    category: "reagents",
    expiry_date: "2026-12-01",
    catalog_reagent_id: 18,
  } as any);

  // B (id 2) is the closest predecessor and carries no pointer yet.
  assert.equal(match?.id, 2);
});

test("guards against a null/absent expiry_date on the incoming batch", () => {
  const existing = [
    { ...base, id: 1, name: "Immucor Panel", expiry_date: "2026-01-01", catalog_reagent_id: 18 },
  ] as any[];

  assert.equal(
    findSupersededReagent(existing, {
      name: "Immucor Panel", category: "reagents", expiry_date: null, catalog_reagent_id: 18,
    } as any),
    null,
  );
});

test("toLoggedQuantity: never writes NaN into the duplication log", () => {
  assert.equal(toLoggedQuantity("10"), 10);
  assert.equal(toLoggedQuantity("2.5"), 2.5);
  assert.equal(toLoggedQuantity(null), null);
  assert.equal(toLoggedQuantity(undefined), null);
  assert.equal(toLoggedQuantity(""), null);
  assert.equal(toLoggedQuantity("   "), null);
  // Free-text quantities exist in the wild ("10 vials"); Number() would yield NaN.
  assert.equal(toLoggedQuantity("10 vials"), null);
  assert.equal(toLoggedQuantity("n/a"), null);
});
