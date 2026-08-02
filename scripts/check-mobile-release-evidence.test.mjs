import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateMobileReleaseEvidence,
  isUiAffectingPath,
} from "./check-mobile-release-evidence.mjs";

const greenBody = `
## Mobile release evidence
- UI impact: yes
- Source: abcdef1234567890
- Viewports: 360, 390, 430, 1440
- Before: ./evidence/before/
- After: artifact:mobile-release-screenshots
- Inspection: PASS
- Rollback: revert the UI commit and rerun the required gate
`;

test("classifies web runtime paths as UI-affecting", () => {
  assert.equal(isUiAffectingPath("apps/web/src/pages/Dashboard.tsx"), true);
  assert.equal(isUiAffectingPath("apps/web/.env.production"), true);
  assert.equal(isUiAffectingPath("apps/web/tailwind.config.js"), true);
  assert.equal(isUiAffectingPath("packages/shared/src/utils.ts"), true);
  assert.equal(isUiAffectingPath("packages/shared/package.json"), true);
  assert.equal(isUiAffectingPath("package-lock.json"), true);
  assert.equal(isUiAffectingPath("apps/api/src/server.ts"), false);
  assert.equal(isUiAffectingPath("apps/web/e2e/mobile-ui.spec.ts"), false);
});

test("accepts complete UI release evidence", () => {
  const result = evaluateMobileReleaseEvidence(
    ["apps/web/src/pages/Dashboard.tsx"],
    greenBody,
    "abcdef1234567890fedcba0987654321abcdef12",
  );
  assert.equal(result.uiAffecting, true);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
});

test("rejects release evidence tied to a different source revision", () => {
  const result = evaluateMobileReleaseEvidence(
    ["apps/web/src/pages/Dashboard.tsx"],
    greenBody,
    "9999999999999999999999999999999999999999",
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["source identity"]);
});

test("rejects untouched template placeholders", () => {
  const result = evaluateMobileReleaseEvidence(
    ["apps/web/src/pages/Dashboard.tsx"],
    `
- Source: abcdef1234567890
- Viewports: 360, 390, 430, 1440
- Before: <!-- durable rendered screenshot/evidence link -->
- After: <!-- durable rendered screenshot/evidence link -->
- Inspection: PASS
- Rollback: <!-- exact revert/artifact procedure -->
`,
    "abcdef1234567890fedcba0987654321abcdef12",
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, [
    "before evidence",
    "after evidence",
    "rollback",
  ]);
});

test("fails closed when required UI evidence is absent", () => {
  const result = evaluateMobileReleaseEvidence(
    ["apps/web/src/components/ReagentCard.tsx"],
    "## Summary\nLooks good",
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, [
    "source identity",
    "viewports 360/390/430 plus desktop",
    "before evidence",
    "after evidence",
    "explicit inspection PASS",
    "rollback",
  ]);
});

test("non-UI changes are exempt without weakening UI changes", () => {
  const result = evaluateMobileReleaseEvidence(
    ["apps/api/tests/security.test.ts", "README.md"],
    "",
  );
  assert.equal(result.uiAffecting, false);
  assert.equal(result.ok, true);
  assert.equal(result.verdict, "NON_UI_EXEMPT");
});
