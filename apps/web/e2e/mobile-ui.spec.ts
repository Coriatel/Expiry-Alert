import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const itemName =
  "Anti-Human CD45 Pacific Blue Monoclonal Antibody Clone HI30 Research Use Only";

const items = [
  {
    id: 900001,
    team_id: 7001,
    name: itemName,
    category: "reagents",
    expiry_date: "2026-08-01",
    received_date: "2026-06-01",
    lot_number: "LONG-LOT-2026-ALPHA-01",
    supplier_id: 44,
    supplier_name: "BioLegend International Distribution",
    quantity: 0,
    manufacturer: "BioLegend",
    description: "Synthetic visual fixture",
    notes: "Synthetic visual fixture",
    is_archived: false,
    in_treatment: false,
    date_updated: "2026-08-02T08:00:00.000Z",
  },
  {
    id: 900002,
    team_id: 7001,
    name: "בקרת איכות המטולוגית רמה 2",
    category: "beads",
    expiry_date: "2026-08-04",
    received_date: "2026-07-01",
    lot_number: "QC-HE-002",
    supplier_name: "מדיקל סופליי ישראל בע״מ",
    quantity: 3,
    is_archived: false,
    in_treatment: true,
    date_updated: "2026-08-02T08:00:00.000Z",
  },
];

const destructionLog = items.map((item, index) => ({
  id: 910000 + index,
  team: 7001,
  reagent_name: item.name,
  supplier_name: item.supplier_name,
  lot_number: item.lot_number,
  expiry_date: item.expiry_date,
  quantity_original: index === 0 ? 0 : 3,
  quantity_destroyed: index,
  destroyed_by_name: index === 0 ? "Visual Test Operator" : "דנה כהן",
  destruction_date: `2026-08-0${index + 1}T10:00:00.000Z`,
}));

const duplicationLog = items.map((item, index) => ({
  id: 920000 + index,
  team: 7001,
  reagent_name: item.name,
  supplier_name: item.supplier_name,
  lot_number: item.lot_number,
  expiry_date: item.expiry_date,
  quantity: index === 0 ? 0 : 3,
  received_by_name: index === 0 ? "Visual Test Operator" : "דנה כהן",
  received_date: `2026-08-0${index + 1}T10:00:00.000Z`,
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
  if (parsed.pathname === "/api/reagents") {
    return parsed.searchParams.get("scope") === "expiring" ? items : items;
  }
  if (parsed.pathname === "/api/suppliers") {
    return [{ id: 44, name: "BioLegend International Distribution" }];
  }
  if (parsed.pathname === "/api/destruction-log") return { log: destructionLog };
  if (parsed.pathname === "/api/duplication-log") return { log: duplicationLog };
  if (parsed.pathname === "/api/messages/unread-count") return { count: 0 };
  if (parsed.pathname === "/api/transfer-requests") return { items: [] };
  return {};
}

async function installReadOnlyFixtures(context: BrowserContext) {
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fulfill({
        status: 405,
        contentType: "application/json",
        body: JSON.stringify({ error: "Synthetic browser fixture is read-only" }),
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

async function assertNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}

async function navigate(page: Page, label: string) {
  const mobileHeader = page.locator("header.md\\:hidden");
  if (await mobileHeader.isVisible()) {
    await mobileHeader.getByRole("button").first().click();
  }
  await page.getByRole("button", { name: label, exact: true }).click();
}

for (const width of [360, 390, 430]) {
  test(`mobile item management remains usable at ${width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 932 },
      locale: "he-IL",
      isMobile: true,
    });
    await installReadOnlyFixtures(context);
    const page = await context.newPage();

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "פריטים פעילים" }).last(),
    ).toBeVisible();
    await assertNoPageOverflow(page);

    const itemCard = page.getByRole("article").filter({ hasText: itemName });
    await expect(itemCard).toBeVisible();
    const longName = itemCard.getByText(itemName, { exact: true });
    await expect(longName).toHaveAttribute("dir", "auto");
    const longNameBounds = await longName.boundingBox();
    expect(longNameBounds).not.toBeNull();
    expect(longNameBounds!.x + longNameBounds!.width).toBeLessThanOrEqual(width);

    const editButton = page.getByRole("button", { name: "ערוך" }).first();
    const editBounds = await editButton.boundingBox();
    expect(editBounds!.width).toBeGreaterThanOrEqual(44);
    expect(editBounds!.height).toBeGreaterThanOrEqual(44);
    await editButton.click();

    await expect(page.getByRole("heading", { name: "עריכת פריט" })).toBeVisible();
    await expect(page.getByLabel("כמות")).toHaveValue("0");
    await expect(page.getByLabel("ספק")).toHaveValue("44");
    await expect(page.getByLabel("תאריך קבלה")).toHaveValue("2026-06-01");
    await assertNoPageOverflow(page);
    await page.keyboard.press("Escape");

    await navigate(page, "היסטוריית אצוות");
    await expect(page.getByTestId("history-card")).toHaveCount(2);
    await assertNoPageOverflow(page);
    await page.getByRole("button", { name: "תצוגת טבלה" }).click();
    await expect(page.getByRole("region", { name: "טבלת היסטוריה נגללת" })).toBeVisible();
    await assertNoPageOverflow(page);
    await page.getByRole("button", { name: "תצוגת כרטיסים" }).click();
    await expect(page.getByTestId("history-card")).toHaveCount(2);

    await navigate(page, "היסטוריית שכפולים");
    await expect(page.getByTestId("history-card")).toHaveCount(2);
    await assertNoPageOverflow(page);

    await context.close();
  });
}

test("desktop history retains the table view", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installReadOnlyFixtures(context);
  await page.goto("/");
  await navigate(page, "היסטוריית אצוות");
  await expect(page.getByRole("region", { name: "טבלת היסטוריה נגללת" })).toBeVisible();
  await assertNoPageOverflow(page);
});
