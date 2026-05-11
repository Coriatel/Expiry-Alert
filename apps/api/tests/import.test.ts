import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessTeam,
  copyReagentData,
  isAdminMembership,
} from "../src/routes/import.ts";

test("isAdminMembership only accepts active owner/admin memberships", () => {
  assert.equal(
    isAdminMembership({ team: 1, role: "owner", status: "active" } as any),
    true,
  );
  assert.equal(
    isAdminMembership({ team: 1, role: "admin", status: "active" } as any),
    true,
  );
  assert.equal(
    isAdminMembership({ team: 1, role: "member", status: "active" } as any),
    false,
  );
  assert.equal(
    isAdminMembership({ team: 1, role: "admin", status: "suspended" } as any),
    false,
  );
});

test("canAccessTeam allows shared memberships and system admins", () => {
  const memberships = [
    { team: 2, role: "member", status: "active" },
    { team: 3, role: "admin", status: "suspended" },
  ] as any[];

  assert.equal(canAccessTeam(memberships, 2, false), true);
  assert.equal(canAccessTeam(memberships, 3, false), false);
  assert.equal(canAccessTeam(memberships, 99, false), false);
  assert.equal(canAccessTeam(memberships, 99, true), true);
});

test("copyReagentData preserves full reagent data and resets import state", () => {
  const copied = copyReagentData({
    id: 12,
    name: "Immucor Panel",
    category: "reagents",
    expiry_date: "2026-08-01",
    lot_number: "LOT-42",
    received_date: "2026-04-10",
    notes: "Keep chilled",
    is_archived: true,
    supplier_id: 7,
    supplier_name: "Immucor",
    quantity: "4",
    manufacturer: "Immucor",
    description: "Full panel",
    catalog_reagent_id: 18,
    in_treatment: true,
  } as any);

  assert.deepEqual(copied, {
    name: "Immucor Panel",
    category: "reagents",
    expiry_date: "2026-08-01",
    lot_number: "LOT-42",
    received_date: "2026-04-10",
    notes: "Keep chilled",
    is_archived: false,
    supplier_id: 7,
    supplier_name: "Immucor",
    quantity: "4",
    manufacturer: "Immucor",
    description: "Full panel",
    catalog_reagent_id: 18,
    in_treatment: false,
  });
});

test("canAccessTeam blocks cross-team import to a team the user is not a member of", () => {
  const memberships = [
    { team: 2, role: "owner", status: "active" },
    { team: 3, role: "admin", status: "active" },
  ] as any[];

  // Regression: prior to QA-2026-05-11 the route accepted any targetTeamId.
  assert.equal(canAccessTeam(memberships, 5, false), false);
  assert.equal(canAccessTeam(memberships, 2, false), true);
});

