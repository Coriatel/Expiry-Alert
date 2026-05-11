import test from "node:test";
import assert from "node:assert/strict";
import {
  authorizeCancel,
  authorizeDecide,
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
  const already = authorizeDecide(
    { to_team: 5, status: "approved" },
    5,
  );
  assert.equal((already as any).status, 409);

  const rejected = authorizeDecide(
    { to_team: 5, status: "rejected" },
    5,
  );
  assert.equal((rejected as any).status, 409);

  const cancelled = authorizeDecide(
    { to_team: 5, status: "cancelled" },
    5,
  );
  assert.equal((cancelled as any).status, 409);
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
