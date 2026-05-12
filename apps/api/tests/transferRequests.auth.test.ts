import test from "node:test";
import assert from "node:assert/strict";
import {
  authorizeCancel,
  authorizeDecide,
  authorizePullSource,
} from "../src/routes/transferRequests.ts";

test("authorizeDecide: only to_team can decide", () => {
  const req = { to_team: 5, status: "pending" };
  assert.deepEqual(authorizeDecide(req, 5), { ok: true });

  const fromTeamTrying = authorizeDecide(req, 3);
  assert.equal(fromTeamTrying.ok, false);
  assert.equal((fromTeamTrying as any).status, 403);

  const stranger = authorizeDecide(req, 99);
  assert.equal((stranger as any).status, 403);
});

test("authorizeDecide: missing request → 404", () => {
  const r = authorizeDecide(null, 5);
  assert.equal(r.ok, false);
  assert.equal((r as any).status, 404);
});

test("authorizeDecide: already-decided → 409", () => {
  for (const status of ["approved", "rejected", "cancelled"] as const) {
    const r = authorizeDecide({ to_team: 5, status }, 5);
    assert.equal((r as any).status, 409);
  }
});

test("authorizeCancel: only from_team can cancel", () => {
  const req = { from_team: 3, status: "pending" };
  assert.deepEqual(authorizeCancel(req, 3), { ok: true });

  const toTeamTrying = authorizeCancel(req, 5);
  assert.equal((toTeamTrying as any).status, 403);

  const stranger = authorizeCancel(req, 99);
  assert.equal((stranger as any).status, 403);
});

test("authorizeCancel: missing → 404, already-decided → 409", () => {
  assert.equal((authorizeCancel(null, 3) as any).status, 404);
  assert.equal(
    (authorizeCancel({ from_team: 3, status: "approved" }, 3) as any).status,
    409,
  );
});

test("authorizePullSource: happy path", () => {
  const r = authorizePullSource(
    { from_team: 7, status: "approved", created_by: 42 },
    7,
    42,
  );
  assert.deepEqual(r, { ok: true });
});

test("authorizePullSource: missing → not_found", () => {
  const r = authorizePullSource(null, 7, 42);
  assert.equal((r as any).status, 404);
  assert.equal((r as any).code, "not_found");
});

test("authorizePullSource: status≠approved → request_not_approved (covers reload-after-completed)", () => {
  for (const status of ["pending", "rejected", "completed", "cancelled"] as const) {
    const r = authorizePullSource(
      { from_team: 7, status, created_by: 42 },
      7,
      42,
    );
    assert.equal((r as any).status, 403);
    assert.equal((r as any).code, "request_not_approved");
  }
});

test("authorizePullSource: wrong source team → forbidden", () => {
  const r = authorizePullSource(
    { from_team: 7, status: "approved", created_by: 42 },
    99,
    42,
  );
  assert.equal((r as any).status, 403);
  assert.equal((r as any).code, "forbidden");
});

test("authorizePullSource: only request creator may pull", () => {
  const r = authorizePullSource(
    { from_team: 7, status: "approved", created_by: 42 },
    7,
    99,
  );
  assert.equal((r as any).status, 403);
  assert.equal((r as any).code, "not_creator");

  const noUser = authorizePullSource(
    { from_team: 7, status: "approved", created_by: 42 },
    7,
    null,
  );
  assert.equal((noUser as any).code, "not_creator");
});
