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
    // RTL: the drawer opens on the right, next to the menu button.
    const drawer = page.locator(".fixed.inset-0 > aside");
    const box = await drawer.boundingBox();
    expect(box, "mobile drawer must render").not.toBeNull();
    expect(Math.round(box!.x + box!.width)).toBe(page.viewportSize()!.width);
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
    const search = page.getByRole("searchbox", { name: "חיפוש לפי שם או מספר אצווה" });
    await assertMinimumTouchTarget(search);
    await assertNotClipped(search);
    await search.fill("qc-he");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article").filter({ hasText: "בקרת איכות המטולוגית רמה 2" })).toBeVisible();
    await expect(page.getByRole("article").filter({ hasText: itemName })).toHaveCount(0);
    const clearSearch = page.getByRole("button", { name: "ניקוי החיפוש" });
    await assertMinimumTouchTarget(clearSearch);
    await search.fill("no-such-lot");
    await expect(page.getByRole("article")).toHaveCount(0);
    await clearSearch.click();
    await expect(search).toHaveValue("");
    // Empty search follows the page direction, so the Hebrew placeholder sits on the right.
    expect(await search.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(clearSearch).toHaveCount(0);
    // The alert bar is one line until opened and must not repeat the items below it.
    const alertBar = page.getByRole("button", { name: /פגי תוקף בקרוב/ });
    await expect(page.getByRole("button", { name: "הזכר לי מחר" })).toHaveCount(0);
    await alertBar.click();
    await expect(page.getByRole("button", { name: "אל תזכיר לי יותר" })).toHaveCount(0);
    await assertNamedButtons(page, [
      "הדפס",
      "הוספת פריטים",
      "תצוגת טבלה",
      "תצוגת כרטיסים",
      "הזכר לי מחר",
      "הזכר לי בעוד 3 ימים",
      "סגור הכל",
    ]);
    // Light alert: a plain surface in a coloured frame (no fill), and the three actions share one compact row.
    const alertFrame = await alertBar.locator("..").evaluate((el) => {
      const style = getComputedStyle(el);
      return { right: style.borderRightWidth, left: style.borderLeftWidth, bg: style.backgroundColor };
    });
    expect(alertFrame).toEqual({ right: "2px", left: "2px", bg: "rgb(255, 255, 255)" });
    const actionBoxes = await Promise.all(
      ["הזכר לי מחר", "הזכר לי בעוד 3 ימים", "סגור הכל"].map((name) =>
        page.getByRole("button", { name, exact: true }).boundingBox(),
      ),
    );
    for (const box of actionBoxes) {
      expect(box).not.toBeNull();
      expect(Math.abs(box!.y - actionBoxes[0]!.y)).toBeLessThanOrEqual(1);
      expect(box!.height).toBeLessThanOrEqual(48);
    }

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

    await itemCard.getByRole("button", { name: "הצג פרטים" }).click();
    const editButton = itemCard.getByRole("button", { name: "ערוך" });
    await expect(editButton).toHaveAccessibleName("ערוך");
    await assertMinimumTouchTarget(editButton);
    // The fixture items are expired, so the server would remind again tomorrow.
    await assertMinimumTouchTarget(itemCard.getByRole("button", { name: "סגור להיום" }));
    await attachRenderedEvidence(page, testInfo, `card-open-${width}`);
    await editButton.click();

    await expect(page.getByRole("heading", { name: "עריכת פריט" })).toBeVisible();
    await expect(page.getByLabel("כמות")).toHaveValue("0");
    await expect(page.getByLabel("ספק")).toHaveValue("44");
    await expect(page.getByLabel("תאריך קבלה")).toHaveValue("01.06.2026");
    await assertNoPageOverflow(page);
    await attachRenderedEvidence(page, testInfo, `edit-item-${width}`);
    await assertNamedButtons(page, ["ביטול", "שמור"]);
    await page.keyboard.press("Escape");

    // The add form opens with a single row; more are added on request.
    await page.getByRole("button", { name: "הוספת פריטים", exact: true }).click();
    const lotInputs = page.getByPlaceholder("מספר אצווה", { exact: true });
    await expect(lotInputs).toHaveCount(1);
    const addAnother = page.getByRole("button", { name: "הוסף פריט נוסף" });
    await assertMinimumTouchTarget(addAnother);
    await assertNotClipped(addAnother);
    // Scan, cancel and save stay on one line, so save never drops to a row of its own.
    const formActions = ["סרוק מדבקה", "ביטול", "שמור"].map((name) =>
      page.getByRole("button", { name, exact: true }),
    );
    const actionTops = await Promise.all(
      formActions.map(async (button) => (await button.boundingBox())!.y),
    );
    expect(Math.max(...actionTops) - Math.min(...actionTops)).toBeLessThanOrEqual(1);
    for (const button of formActions) await assertNotClipped(button);
    // The date is typed on the numeric keyboard (dots added automatically) and the calendar has its own button.
    const expiryInput = page.getByPlaceholder("dd.mm.yyyy").first();
    await expect(expiryInput).toHaveAttribute("inputmode", "numeric");
    await expiryInput.fill("");
    await expiryInput.pressSequentially("31122026");
    await expect(expiryInput).toHaveValue("31.12.2026");
    await expect(page.locator('input[type="date"]').first()).toHaveValue("2026-12-31");
    await assertMinimumTouchTarget(page.getByRole("button", { name: "פתח לוח שנה" }).first());
    await expiryInput.fill("");
    await assertNoPageOverflow(page);
    await attachRenderedEvidence(page, testInfo, `add-form-${width}`);
    await addAnother.click();
    await expect(lotInputs).toHaveCount(2);
    await assertNoPageOverflow(page);
    await page.getByRole("button", { name: "ביטול", exact: true }).click();
    await expect(lotInputs).toHaveCount(0);

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
  await page.getByRole("button", { name: "הוספת פריטים", exact: true }).click();
  await expect(page.getByPlaceholder("מספר אצווה", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "הוסף פריט נוסף" })).toBeVisible();
  await assertNoPageOverflow(page);
  await attachRenderedEvidence(page, testInfo, "add-form-1440");
  await page.getByRole("button", { name: "ביטול", exact: true }).click();
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

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 932 },
    { width: 430, height: 932 },
    { width: 1440, height: 900 },
  ]) {
    const emptyContext = await browser.newContext({
      viewport,
      locale: "he-IL",
      isMobile: viewport.width < 768,
      reducedMotion: "reduce",
    });
    await installReadOnlyFixtures(emptyContext);
    await emptyContext.route("**/api/reagents**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    const emptyPage = await emptyContext.newPage();
    await emptyPage.goto("/");
    await expect(
      emptyPage.getByText("לא נמצאו פריטים").filter({ visible: true }),
    ).toHaveCount(1);
    await assertNoPageOverflow(emptyPage);
    await attachRenderedEvidence(emptyPage, testInfo, `dashboard-empty-${viewport.width}`);
    await emptyContext.close();
  }
});
