import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_REAGENT_QUANTITY,
  authorizeReagentUpdate,
  buildReagentUpdateFilter,
  buildReagentData,
  reagentSchema,
} from "../src/routes/reagents.js";

const validInput = {
  name: "Synthetic item",
  category: "reagents" as const,
  expiryDate: "2026-12-31",
};

test("quantity validation distinguishes missing, zero, invalid and excessive values", () => {
  assert.equal(reagentSchema.safeParse(validInput).success, true);
  assert.equal(reagentSchema.safeParse({ ...validInput, quantity: null }).success, true);
  assert.equal(reagentSchema.safeParse({ ...validInput, quantity: 0 }).success, true);
  assert.equal(reagentSchema.safeParse({ ...validInput, quantity: -1 }).success, false);
  assert.equal(reagentSchema.safeParse({ ...validInput, quantity: 1.5 }).success, false);
  assert.equal(
    reagentSchema.safeParse({
      ...validInput,
      quantity: MAX_REAGENT_QUANTITY + 1,
    }).success,
    false,
  );
});

test("buildReagentData persists zero and clears a missing quantity", () => {
  assert.equal(
    buildReagentData({ ...validInput, quantity: 0 }).quantity,
    "0",
  );
  assert.equal(buildReagentData(validInput).quantity, null);
  assert.equal(
    buildReagentData({ ...validInput, quantity: null }).quantity,
    null,
  );
});

test("item updates are team scoped", () => {
  const current = { team: 7 };

  assert.deepEqual(authorizeReagentUpdate(current, 7), { ok: true });
  assert.deepEqual(authorizeReagentUpdate(current, 8), {
    ok: false,
    status: 404,
    code: "ITEM_NOT_FOUND",
  });
  assert.deepEqual(authorizeReagentUpdate(null, 7), {
    ok: false,
    status: 404,
    code: "ITEM_NOT_FOUND",
  });
});

test("item updates atomically compare the original editable fields", () => {
  assert.deepEqual(buildReagentUpdateFilter(42, 7, {
    ...validInput,
    quantity: "0",
    isArchived: false,
  }), {
    id: { _eq: 42 },
    team: { _eq: 7 },
    name: { _eq: "Synthetic item" },
    category: { _eq: "reagents" },
    expiry_date: { _eq: "2026-12-31" },
    lot_number: { _null: true },
    received_date: { _null: true },
    notes: { _null: true },
    supplier_id: { _null: true },
    supplier_name: { _null: true },
    quantity: { _eq: "0" },
    manufacturer: { _null: true },
    description: { _null: true },
    is_archived: { _eq: false },
  });
  assert.deepEqual(buildReagentUpdateFilter(42, 7), {
    id: { _eq: 42 },
    team: { _eq: 7 },
  });
});
