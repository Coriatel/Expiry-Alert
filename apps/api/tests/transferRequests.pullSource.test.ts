import test from "node:test";
import assert from "node:assert/strict";
import { authorizePullSource } from "../src/routes/transferRequests.ts";

const APPROVED = {
  from_team: 5,
  to_team: 9,
  status: "approved",
  created_by: 42,
};

test("authorizePullSource: missing request → 404", () => {
  const r = authorizePullSource(null, 5, 42);
  assert.equal(r.ok, false);
  assert.equal((r as any).status, 404);
});

test("authorizePullSource: non-approved statuses → 403", () => {
  for (const status of ["pending", "rejected", "cancelled"] as const) {
    const r = authorizePullSource({ ...APPROVED, status }, 5, 42);
    assert.equal(r.ok, false, `status=${status} should be denied`);
    assert.equal((r as any).status, 403);
    assert.match((r as any).error, /not approved/i);
  }
});

test("authorizePullSource: wrong team (caller is not from_team) → 403", () => {
  const r = authorizePullSource(APPROVED, 9, 42); // caller is to_team
  assert.equal((r as any).status, 403);

  const stranger = authorizePullSource(APPROVED, 77, 42);
  assert.equal((stranger as any).status, 403);
});

test("authorizePullSource: wrong user (not the creator) → 403", () => {
  const r = authorizePullSource(APPROVED, 5, 99);
  assert.equal((r as any).status, 403);
  assert.match((r as any).error, /creator/i);
});

test("authorizePullSource: null/undefined user → 403", () => {
  const rNull = authorizePullSource(APPROVED, 5, null);
  assert.equal((rNull as any).status, 403);
});

test("authorizePullSource: created_by null on request → 403 (no one can claim ownership)", () => {
  const r = authorizePullSource(
    { ...APPROVED, created_by: null },
    5,
    42,
  );
  assert.equal((r as any).status, 403);
});

test("authorizePullSource: approved + correct team + correct user → ok", () => {
  const r = authorizePullSource(APPROVED, 5, 42);
  assert.deepEqual(r, { ok: true });
});
