import test from "node:test";
import assert from "node:assert/strict";
import {
  reagentSchema,
  buildReagentData,
} from "../src/routes/reagents.ts";

test("reagentSchema accepts manufacturer and description", () => {
  const parsed = reagentSchema.safeParse({
    name: "Alpha",
    category: "reagents",
    expiryDate: "2027-01-01",
    manufacturer: "BIORAD",
    description: "Primary antibody, 500ul aliquot",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.manufacturer, "BIORAD");
    assert.equal(parsed.data.description, "Primary antibody, 500ul aliquot");
  }
});

test("reagentSchema treats manufacturer/description as optional", () => {
  const parsed = reagentSchema.safeParse({
    name: "Alpha",
    category: "reagents",
    expiryDate: "2027-01-01",
  });
  assert.equal(parsed.success, true);
});

test("reagentSchema accepts null manufacturer/description", () => {
  const parsed = reagentSchema.safeParse({
    name: "Alpha",
    category: "reagents",
    expiryDate: "2027-01-01",
    manufacturer: null,
    description: null,
  });
  assert.equal(parsed.success, true);
});

test("reagentSchema rejects manufacturer longer than 255 chars", () => {
  const parsed = reagentSchema.safeParse({
    name: "Alpha",
    category: "reagents",
    expiryDate: "2027-01-01",
    manufacturer: "A".repeat(256),
  });
  assert.equal(parsed.success, false);
});

test("reagentSchema rejects description longer than 2000 chars", () => {
  const parsed = reagentSchema.safeParse({
    name: "Alpha",
    category: "reagents",
    expiryDate: "2027-01-01",
    description: "B".repeat(2001),
  });
  assert.equal(parsed.success, false);
});

test("reagentSchema trims manufacturer and description whitespace", () => {
  const parsed = reagentSchema.safeParse({
    name: "Alpha",
    category: "reagents",
    expiryDate: "2027-01-01",
    manufacturer: "  BIORAD  ",
    description: "  hello  ",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.manufacturer, "BIORAD");
    assert.equal(parsed.data.description, "hello");
  }
});

test("buildReagentData forwards manufacturer and description to service payload", () => {
  const data = buildReagentData({
    name: "Alpha",
    category: "reagents",
    expiryDate: "2027-01-01",
    manufacturer: "BIORAD",
    description: "desc",
    lotNumber: null,
    receivedDate: null,
    notes: null,
    supplier_id: null,
    supplier_name: null,
    quantity: null,
  });
  assert.equal(data.manufacturer, "BIORAD");
  assert.equal(data.description, "desc");
  assert.equal(data.name, "Alpha");
  assert.equal(data.expiry_date, "2027-01-01");
});

test("buildReagentData preserves null for omitted manufacturer/description", () => {
  const data = buildReagentData({
    name: "Alpha",
    category: "reagents",
    expiryDate: "2027-01-01",
    lotNumber: null,
    receivedDate: null,
    notes: null,
    supplier_id: null,
    supplier_name: null,
    quantity: null,
  });
  assert.equal(data.manufacturer, null);
  assert.equal(data.description, null);
});
