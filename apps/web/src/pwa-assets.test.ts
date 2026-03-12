/// <reference types="node" />
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

describe("PWA asset references", () => {
  it("uses versioned icon paths in index.html", () => {
    const html = readFileSync(path.join(webRoot, "index.html"), "utf8");

    expect(html).toContain("/favicon-v2.ico");
    expect(html).toContain("/favicon-32-v2.png");
    expect(html).toContain("/favicon-16-v2.png");
    expect(html).toContain("/apple-touch-icon-v2.png");
    expect(html).toContain("/mask-icon-v2.svg");
  });

  it("uses versioned icon paths in vite PWA manifest config", () => {
    const viteConfig = readFileSync(path.join(webRoot, "vite.config.ts"), "utf8");

    expect(viteConfig).toContain("favicon-v2.ico");
    expect(viteConfig).toContain("apple-touch-icon-v2.png");
    expect(viteConfig).toContain("/icon-192-v2.png");
    expect(viteConfig).toContain("/icon-512-v2.png");
    expect(viteConfig).toContain("/icon-maskable-512-v2.png");
  });
});
