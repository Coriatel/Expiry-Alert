import test from "node:test";
import assert from "node:assert/strict";
import { buildReagentData, reagentsRouter } from "../src/routes/reagents.ts";

test("an empty received date is stored as no date, not as empty text", () => {
  const data = buildReagentData({
    name: "Synthetic item",
    category: "reagents",
    expiryDate: "2026-12-31",
    receivedDate: "",
  } as any);
  assert.equal(data.received_date, null);
});

function routeHandler(method: string, path: string) {
  const layer = (reagentsRouter as any).stack.find(
    (l: any) => l?.route?.path === path && l.route.methods?.[method] === true,
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} must exist`);
  return layer.route.stack[0].handle;
}

for (const [method, path, body] of [
  ["put", "/:id", { name: "Synthetic item", category: "reagents", expiryDate: "2026-12-31" }],
  ["delete", "/:id", {}],
] as const) {
  test(`${method.toUpperCase()} ${path} hands a data-layer failure to the error handler instead of hanging`, async () => {
    const handle = routeHandler(method, path);
    const req = { params: { id: "1" }, body, session: { teamId: 1 } } as any;
    const res = {
      status() { return this; },
      json() { return this; },
      send() { return this; },
    } as any;
    const err = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve("no next() within 15s"), 15_000);
      handle(req, res, (e: unknown) => { clearTimeout(timer); resolve(e); });
    });
    assert.ok(err instanceof Error || (err && typeof err === "object"), `expected next(err), got ${String(err)}`);
  });
}
