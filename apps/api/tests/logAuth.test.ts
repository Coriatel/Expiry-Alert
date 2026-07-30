import test from "node:test";
import assert from "node:assert/strict";
import { authorizeLogMutation } from "../src/utils/logAuth.ts";

test("allows mutation of a log entry owned by the caller's team", () => {
  assert.deepEqual(authorizeLogMutation({ team: 2 }, 2), { ok: true });
});

test("blocks cross-team log mutation", () => {
  const r = authorizeLogMutation({ team: 3 }, 2);
  assert.equal(r.ok, false);
  assert.equal((r as any).status, 403);
});

test("missing entry is 404, missing team is 400", () => {
  assert.equal((authorizeLogMutation(null, 2) as any).status, 404);
  assert.equal((authorizeLogMutation({ team: 2 }, null) as any).status, 400);
  assert.equal((authorizeLogMutation(undefined, 0) as any).status, 400);
});

test("entry with null team is never mutable", () => {
  const r = authorizeLogMutation({ team: null }, 2);
  assert.equal(r.ok, false);
  assert.equal((r as any).status, 403);
});
