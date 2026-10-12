import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("static document language", () => {
  it("declares Hebrew before the runtime i18n effect runs", () => {
    const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");
    expect(html).toMatch(/<html\s+lang="he"/);
  });
});
