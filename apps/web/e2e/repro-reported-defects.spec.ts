import { expect, test, type BrowserContext } from "@playwright/test";

// Reproduction harness for owner-reported production defects (2026-08-04).
// Read-only fixtures modelled on mobile-ui.spec.ts.

const items = Array.from({ length: 6 }, (_, index) => ({
  id: 900001 + index,
  team_id: 7001,
  name: `IH-QC ${index + 1} (4x6ML)`,
  category: "reagents",
  expiry_date: index < 3 ? "2026-08-03" : "2026-08-07",
  received_date: "2026-07-30",
  lot_number: `1155710${index}`,
  supplier_id: 44,
  supplier_name: "BIORAD",
  quantity: 3,
  manufacturer: "Biorad",
  description: "כדוריות QC לשיטת הכרטיסיות",
  notes: "",
  is_archived: false,
  in_treatment: false,
  date_updated: "2026-08-02T08:00:00.000Z",
}));

function fixtureFor(url: string) {
  const parsed = new URL(url);
  if (parsed.pathname === "/api/auth/me") {
    return {
      id: 800001,
      email: "visual-fixture@example.invalid",
      name: "Visual Test Operator",
      team_id: 7001,
      team_approved: true,
      membership_status: "active",
    };
  }
  if (parsed.pathname === "/api/teams") {
    return {
      teams: [{ id: 7001, name: "המעבדה המרכזית", role: "owner" }],
      currentTeamId: 7001,
    };
  }
  if (parsed.pathname === "/api/reagents") return items;
  if (parsed.pathname === "/api/suppliers") return [{ id: 44, name: "BIORAD" }];
  if (parsed.pathname === "/api/messages/unread-count") return { count: 0 };
  if (parsed.pathname === "/api/transfer-requests") return { items: [] };
  return {};
}

async function installFixtures(
  context: BrowserContext,
  options: { hangWrites?: boolean } = {},
) {
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      if (options.hangWrites) return; // never fulfilled -> simulates stalled network
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixtureFor(request.url())),
    });
  });
}

test("select-all marks every card", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    locale: "he-IL",
    isMobile: true,
  });
  await installFixtures(context);
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "פריטים פעילים" }).last()).toBeVisible();

  const selectAll = page.getByRole("button", { name: "בחר הכל" }).first();
  await selectAll.click();

  const pressed = page.locator('article [aria-pressed="true"]');
  await expect(pressed).toHaveCount(items.length);
  await context.close();
});

test("snooze-all raises a single toast", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    locale: "he-IL",
    isMobile: true,
  });
  await installFixtures(context);
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "הזכר לי מחר" }).click();
  await page.waitForTimeout(1500);
  expect(await page.getByText(/התראות נדחו/).count()).toBe(1);
  expect(await page.getByText("ההתראה נדחתה").count()).toBe(0);
  await context.close();
});

test("table view leaves most width to the data", async ({ browser }) => {
  const width = 390;
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    locale: "he-IL",
    isMobile: true,
  });
  await installFixtures(context);
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "תצוגת טבלה" }).click();
  const region = page.getByRole("region", { name: "טבלת פריטים פעילים" });
  await expect(region).toBeVisible();
  // The name column is what stays pinned; actions must not eat the viewport.
  const stickyCells = region.locator("tbody tr").first().locator("td.sticky");
  await expect(stickyCells).toHaveCount(1);
  const box = await stickyCells.first().boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThan(width * 0.6);
  await expect(
    region.locator("tbody tr").first().locator("td").last(),
  ).not.toHaveClass(/sticky/);
  await context.close();
});

test("saving an item cannot hang forever", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    locale: "he-IL",
    isMobile: true,
  });
  await installFixtures(context, { hangWrites: true });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "ערוך" }).first().click();
  await expect(page.getByRole("heading", { name: "עריכת פריט" })).toBeVisible();
  await page.getByLabel("כמות").fill("7");
  await page.getByRole("button", { name: "שמור" }).click();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 40_000 });
  await context.close();
});
