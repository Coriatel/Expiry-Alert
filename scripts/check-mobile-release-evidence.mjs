#!/usr/bin/env node

const UI_PATHS = [
  /^apps\/web\/src\//,
  /^apps\/web\/public\//,
  /^apps\/web\/index\.html$/,
  /^apps\/web\/package\.json$/,
  /^apps\/web\/(tailwind|postcss|vite)\.config\.[cm]?[jt]s$/,
  /^index\.html$/,
  /^(tailwind|postcss|vite)\.config\.[cm]?[jt]s$/,
];

export function isUiAffectingPath(path) {
  return UI_PATHS.some((pattern) => pattern.test(path));
}

function field(body, name) {
  const match = body.match(new RegExp(`^\\s*-?\\s*${name}\\s*:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? "";
}

function meaningful(value) {
  const withoutComments = value.replace(/<!--[\s\S]*?-->/g, "").trim();
  return Boolean(withoutComments) && !/^(n\/?a|none|todo|tbd|-+)$/i.test(withoutComments);
}

function evidenceReference(value) {
  const withoutComments = value.replace(/<!--[\s\S]*?-->/g, "").trim();
  return (
    meaningful(withoutComments) &&
    (/(?:https?:\/\/|artifact:)[^\s)]+/i.test(withoutComments) ||
      /(?:^|\s)(?:\.{0,2}\/|\/)[^\s]+/.test(withoutComments))
  );
}

export function evaluateMobileReleaseEvidence(changedFiles, body, expectedSource = "") {
  const uiFiles = changedFiles.filter(isUiAffectingPath);
  if (uiFiles.length === 0) {
    return {
      ok: true,
      uiAffecting: false,
      verdict: "NON_UI_EXEMPT",
      uiFiles: [],
      missing: [],
    };
  }

  const source = field(body, "Source");
  const viewports = field(body, "Viewports");
  const before = field(body, "Before");
  const after = field(body, "After");
  const inspection = field(body, "Inspection");
  const rollback = field(body, "Rollback");
  const missing = [];
  const sourceSha = source.match(/\b[0-9a-f]{12,40}\b/i)?.[0] ?? "";

  if (
    !meaningful(source) ||
    !sourceSha ||
    (expectedSource && !expectedSource.toLowerCase().startsWith(sourceSha.toLowerCase()))
  ) {
    missing.push("source identity");
  }
  const requiredMobile = ["360", "390", "430"].every((width) =>
    new RegExp(`(^|\\D)${width}(\\D|$)`).test(viewports),
  );
  const hasDesktop = /(^|\D)(1024|1280|1366|1440|1536|1920)(\D|$)/.test(viewports);
  if (!requiredMobile || !hasDesktop) {
    missing.push("viewports 360/390/430 plus desktop");
  }
  if (!evidenceReference(before)) missing.push("before evidence");
  if (!evidenceReference(after)) missing.push("after evidence");
  if (inspection.toUpperCase() !== "PASS") missing.push("explicit inspection PASS");
  if (!meaningful(rollback)) missing.push("rollback");

  return {
    ok: missing.length === 0,
    uiAffecting: true,
    verdict: missing.length === 0 ? "RELEASE_EVIDENCE_COMPLETE" : "RELEASE_EVIDENCE_INCOMPLETE",
    uiFiles,
    missing,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const changedFiles = (process.env.MOBILE_RELEASE_CHANGED_FILES ?? "")
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean);
  const body = process.env.MOBILE_RELEASE_PR_BODY ?? "";
  const expectedSource = process.env.MOBILE_RELEASE_HEAD_SHA ?? "";
  const result = evaluateMobileReleaseEvidence(changedFiles, body, expectedSource);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
