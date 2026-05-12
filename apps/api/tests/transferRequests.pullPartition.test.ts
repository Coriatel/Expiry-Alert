import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLot,
  partitionPullRequest,
} from "../src/routes/transferRequests.ts";

const baseReagent = {
  team: 0,
  category: "reagents" as const,
  is_archived: false,
  date_created: "2026-01-01T00:00:00Z",
  date_updated: "2026-01-01T00:00:00Z",
};

const r = (id: number, lot: string | null, name = `r${id}`) => ({
  ...baseReagent,
  id,
  name,
  expiry_date: "2027-01-01",
  lot_number: lot,
});

test("normalizeLot: strips whitespace, lowercases, blanks → null", () => {
  assert.equal(normalizeLot("ABC 123"), "abc123");
  assert.equal(normalizeLot("  abc\t123 "), "abc123");
  assert.equal(normalizeLot("ABC123"), "abc123");
  assert.equal(normalizeLot(""), null);
  assert.equal(normalizeLot("   "), null);
  assert.equal(normalizeLot(null), null);
  assert.equal(normalizeLot(undefined), null);
});

test("partition: happy — all new lots are imported, none skipped", () => {
  const src = [r(1, "AB1"), r(2, "CD2"), r(3, "EF3")];
  const caller = [r(99, "XX9")];
  const out = partitionPullRequest(src, caller, [1, 2, 3]);
  assert.equal(out.toImport.length, 3);
  assert.equal(out.skipped.length, 0);
  assert.deepEqual(
    out.toImport.map((x) => x.id),
    [1, 2, 3],
  );
});

test("partition: all-dup — every requested lot already exists in caller", () => {
  const src = [r(1, "AB1"), r(2, "CD2")];
  const caller = [r(50, "ab 1"), r(51, "CD2")];
  const out = partitionPullRequest(src, caller, [1, 2]);
  assert.equal(out.toImport.length, 0);
  assert.equal(out.skipped.length, 2);
  assert.ok(out.skipped.every((s) => s.reason === "duplicate_lot"));
});

test("partition: mixed — dup-by-whitespace skipped, new imported", () => {
  const src = [r(1, "AB 1"), r(2, "NEW2"), r(3, "ef3")];
  const caller = [r(50, "ab1"), r(51, "EF 3")];
  const out = partitionPullRequest(src, caller, [1, 2, 3]);
  assert.equal(out.toImport.length, 1);
  assert.equal(out.toImport[0].id, 2);
  assert.equal(out.skipped.length, 2);
  assert.deepEqual(
    out.skipped.map((s) => s.old_id).sort(),
    [1, 3],
  );
});

test("partition: missing lot on source → never a duplicate, always imports", () => {
  const src = [r(1, null), r(2, "")];
  const caller = [r(50, null), r(51, "")];
  const out = partitionPullRequest(src, caller, [1, 2]);
  assert.equal(out.toImport.length, 2);
  assert.equal(out.skipped.length, 0);
});

test("partition: requested id not in source → skipped reason=not_in_source", () => {
  const src = [r(1, "AB1")];
  const caller: ReturnType<typeof r>[] = [];
  const out = partitionPullRequest(src, caller, [1, 999]);
  assert.equal(out.toImport.length, 1);
  assert.equal(out.skipped.length, 1);
  assert.equal(out.skipped[0].old_id, 999);
  assert.equal(out.skipped[0].reason, "not_in_source");
});

test("partition: duplicate ids in request — deduped, processed once", () => {
  const src = [r(1, "AB1")];
  const caller: ReturnType<typeof r>[] = [];
  const out = partitionPullRequest(src, caller, [1, 1, 1]);
  assert.equal(out.toImport.length, 1);
  assert.equal(out.skipped.length, 0);
});
