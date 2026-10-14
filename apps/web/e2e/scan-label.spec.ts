import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { attachRenderedEvidence } from "./mobile-release-assertions";

// Each fixture is a photo of a real label taken in the lab, replayed as the
// camera feed, so the whole path runs: camera -> decoder -> form fields.
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

// Launch options cannot vary per test, so each test starts its own browser
// with the camera feed it needs.
async function withCamera(file: string, run: (page: Page) => Promise<void>) {
  const browser = await chromium.launch({
    executablePath: process.env.CI ? undefined : "/usr/bin/google-chrome",
    args: [
      "--no-sandbox",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${path.join(fixtures, file)}`,
    ],
  });
  try {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      locale: "he-IL",
      viewport: { width: 390, height: 844 },
    });
    await installFixtures(context);
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: "הוספת פריטים" }).first().click();
    await page.getByRole("button", { name: "סרוק מדבקה" }).click();
    await run(page);
  } finally {
    await browser.close();
  }
}

async function installFixtures(context: BrowserContext) {
  await context.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const body =
      pathname === "/api/auth/me"
        ? {
            id: 800001,
            email: "visual-fixture@example.invalid",
            name: "Visual Test Operator",
            team_id: 7001,
            team_approved: true,
            membership_status: "active",
          }
        : pathname === "/api/teams"
          ? {
              teams: [{ id: 7001, name: "המעבדה המרכזית", role: "owner" }],
              currentTeamId: 7001,
            }
          : pathname === "/api/reagents" || pathname === "/api/suppliers"
            ? []
            : pathname === "/api/messages/unread-count"
              ? { count: 0 }
              : pathname === "/api/transfer-requests"
                ? { items: [] }
                : {};
    await route.fulfill({
      status: route.request().method() === "GET" ? 200 : 405,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

const labels = [
  { file: "label-biorad-gs1.mjpeg", lot: "137061321", expiry: "2026-10-12" },
  { file: "label-diagast-gs1.mjpeg", lot: "872000", expiry: "2027-03-31" },
  { file: "label-immucor-vial.mjpeg", lot: "954285", expiry: "2027-05-12" },
];

for (const label of labels) {
  test(`scanning ${label.file} fills lot and expiry in the first row`, async ({}, testInfo) => {
    await withCamera(label.file, async (page) => {
      await expect(page.getByPlaceholder("מספר אצווה").first()).toHaveValue(
        label.lot,
        { timeout: 20_000 },
      );
      await expect(page.locator('input[type="date"]').first()).toHaveValue(
        label.expiry,
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await attachRenderedEvidence(page, testInfo, `scan-${label.file.replace(".mjpeg", "")}`);
    });
  });
}

// A synthetic Code 128 holding only a catalog number, like the one on an Immucor box.
test("a barcode without lot and expiry says so and fills nothing", async () => {
  await withCamera("label-catalog-number.mjpeg", async (page) => {
    await expect(page.getByRole("status")).toContainText(
      "אין בו מספר אצווה ותוקף",
      { timeout: 20_000 },
    );
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("מספר אצווה").first()).toHaveValue("");
  });
});
