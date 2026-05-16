import test from "node:test";
import assert from "node:assert/strict";
import {
  reagentTreatmentSchema,
  reagentsRouter,
} from "../src/routes/reagents.ts";

test("reagentTreatmentSchema accepts boolean in_treatment payloads", () => {
  const parsed = reagentTreatmentSchema.safeParse({
    in_treatment: true,
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.in_treatment, true);
  }
});

test("reagentTreatmentSchema rejects missing or non-boolean payloads", () => {
  assert.equal(reagentTreatmentSchema.safeParse({}).success, false);
  assert.equal(
    reagentTreatmentSchema.safeParse({ in_treatment: "true" }).success,
    false,
  );
});

test("reagentsRouter exposes PATCH /:id/in-treatment", () => {
  const routeLayer = (reagentsRouter as any).stack.find(
    (layer: any) =>
      layer?.route?.path === "/:id/in-treatment" &&
      layer.route.methods?.patch === true,
  );

  assert.ok(routeLayer, "expected PATCH /:id/in-treatment route to exist");
});
