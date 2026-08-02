import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  assertMinimumTouchTarget,
  assertNoPageOverflow,
  assertNotClipped,
  assertScrollableRegionReachable,
  assertVisibleFocus,
  attachRenderedEvidence,
} from "./mobile-release-assertions";

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

async function assertNamedButtons(page: Page, names: string[]) {
  for (const name of names) {
    const buttons = page.getByRole("button", { name, exact: true });
    expect(await buttons.count(), `${name} control must exist`).toBeGreaterThan(0);
    for (const button of await buttons.all()) {
      if (await button.isVisible()) {
        await expect(button).toHaveAccessibleName(name);
        await assertMinimumTouchTarget(button);
      }
    }
  }
}

async function navigate(page: Page, label: string) {
  const openNavigation = page.getByRole("button", { name: "פתיחת ניווט" });
  if ((page.viewportSize()?.width ?? 1024) < 768) {
    await expect(openNavigation).toBeVisible();
    await openNavigation.click();
  }
  await page.getByRole("button", { name: label, exact: true }).click();
}

for (const width of [360, 390, 430]) {
  test(`mobile release invariants hold at ${width}px`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width, height: 932 },
      locale: "he-IL",
      isMobile: true,
      reducedMotion: "reduce",
    });
    await installReadOnlyFixtures(context);
    const page = await context.newPage();

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "פריטים פעילים" }).last(),
    ).toBeVisible();
    await assertNoPageOverflow(page);
    await attachRenderedEvidence(page, testInfo, `dashboard-${width}`);
    await assertNamedButtons(page, [
      "הדפס",
      "הוספת פריטים",
      "תצוגת טבלה",
      "תצוגת כרטיסים",
      "אל תזכיר לי יותר",
      "הזכר לי מחר",
      "הזכר לי בעוד 3 ימים",
      "סגור הכל",
    ]);

    await page.keyboard.press("Tab");
    const firstKeyboardTarget = page.locator(":focus");
    await expect(firstKeyboardTarget).toHaveAccessibleName(/.+/);
    await assertVisibleFocus(firstKeyboardTarget);

    const itemCard = page.getByRole("article").filter({ hasText: itemName });
    await expect(itemCard).toBeVisible();
    const longName = itemCard.getByText(itemName, { exact: true });
    await expect(longName).toHaveAttribute("dir", "auto");
    const longNameBounds = await longName.boundingBox();
    expect(longNameBounds).not.toBeNull();
    expect(longNameBounds!.x + longNameBounds!.width).toBeLessThanOrEqual(width);
    await assertNotClipped(longName);

    const editButton = page.getByRole("button", { name: "ערוך" }).first();
    await expect(editButton).toHaveAccessibleName("ערוך");
    await assertMinimumTouchTarget(editButton);
    await editButton.click();

    await expect(page.getByRole("heading", { name: "עריכת פריט" })).toBeVisible();
    await expect(page.getByLabel("כמות")).toHaveValue("0");
    await expect(page.getByLabel("ספק")).toHaveValue("44");
    await expect(page.getByLabel("תאריך קבלה")).toHaveValue("2026-06-01");
    await assertNoPageOverflow(page);
    await attachRenderedEvidence(page, testInfo, `edit-item-${width}`);
    await assertNamedButtons(page, ["ביטול", "שמור"]);
    await page.keyboard.press("Escape");

    await navigate(page, "היסטוריית אצוות");
    await expect(page.getByTestId("history-card")).toHaveCount(2);
    await assertNoPageOverflow(page);
    const destructionCard = page.getByTestId("history-card").first();
    for (const action of await destructionCard.getByRole("button").all()) {
      await expect(action).toHaveAccessibleName(/.+/);
      await assertMinimumTouchTarget(action);
    }
    await attachRenderedEvidence(page, testInfo, `destruction-cards-${width}`);
    await assertNamedButtons(page, ["תצוגת טבלה", "תצוגת כרטיסים"]);
    await page.getByRole("button", { name: "תצוגת טבלה" }).click();
    const destructionTable = page.getByRole("region", {
      name: "טבלת היסטוריה נגללת",
    });
    await expect(destructionTable).toBeVisible();
    await expect(destructionTable.getByText(itemName, { exact: true })).toBeVisible();
    await assertScrollableRegionReachable(destructionTable);
    await assertNoPageOverflow(page);
    await attachRenderedEvidence(page, testInfo, `destruction-table-${width}`);
    await page.getByRole("button", { name: "תצוגת כרטיסים" }).click();
    await expect(page.getByTestId("history-card")).toHaveCount(2);

    await navigate(page, "היסטוריית שכפולים");
    await expect(page.getByTestId("history-card")).toHaveCount(2);
    await assertNoPageOverflow(page);
    const duplicationCard = page.getByTestId("history-card").first();
    for (const action of await duplicationCard.getByRole("button").all()) {
      await expect(action).toHaveAccessibleName(/.+/);
      await assertMinimumTouchTarget(action);
    }
    await attachRenderedEvidence(page, testInfo, `duplication-cards-${width}`);
    await assertNamedButtons(page, ["תצוגת טבלה", "תצוגת כרטיסים"]);
    await page.getByRole("button", { name: "תצוגת טבלה" }).click();
    const duplicationTable = page.getByRole("region", {
      name: "טבלת היסטוריה נגללת",
    });
    await expect(duplicationTable.getByText(itemName, { exact: true })).toBeVisible();
    await assertScrollableRegionReachable(duplicationTable);
    await attachRenderedEvidence(page, testInfo, `duplication-table-${width}`);
    await page.getByRole("button", { name: "תצוגת כרטיסים" }).click();
    await expect(page.getByTestId("history-card")).toHaveCount(2);

    await context.close();
  });
}

test("desktop release preserves dashboard and history tables", async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installReadOnlyFixtures(context);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "פריטים פעילים" }).last()).toBeVisible();
  await assertNoPageOverflow(page);
  await attachRenderedEvidence(page, testInfo, "dashboard-1440");
  await navigate(page, "היסטוריית אצוות");
  await expect(page.getByRole("region", { name: "טבלת היסטוריה נגללת" })).toBeVisible();
  await assertNoPageOverflow(page);
  await attachRenderedEvidence(page, testInfo, "destruction-table-1440");
});

test("mobile empty, loading, and error states render evidence", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 932 },
    locale: "he-IL",
    isMobile: true,
    reducedMotion: "reduce",
  });
  await installReadOnlyFixtures(context);
  await context.route("**/api/destruction-log**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ log: [] }),
    });
  });
  const page = await context.newPage();
  await page.goto("/");
  await navigate(page, "היסטוריית אצוות");
  await expect(page.getByText("מעבד...")).toBeVisible();
  await attachRenderedEvidence(page, testInfo, "history-loading-390");
  await expect(page.getByText("אין רשומות")).toBeVisible();
  await attachRenderedEvidence(page, testInfo, "history-empty-390");
  await context.close();

  const errorContext = await browser.newContext({
    viewport: { width: 390, height: 932 },
    locale: "he-IL",
    isMobile: true,
    reducedMotion: "reduce",
  });
  await installReadOnlyFixtures(errorContext);
  await errorContext.route("**/api/reagents**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Synthetic release-gate failure" }),
    });
  });
  const errorPage = await errorContext.newPage();
  await errorPage.goto("/");
  await expect(errorPage.getByText("שגיאה בטעינת הנתונים. נא לנסות שוב.")).toBeVisible();
  await assertNoPageOverflow(errorPage);
  await attachRenderedEvidence(errorPage, testInfo, "dashboard-error-390");
  await errorContext.close();
});
