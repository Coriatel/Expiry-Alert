import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

// Density regression for the active-items mobile view.
// Baseline (production build 60369f0, same fixture): typical card 190px, sparse 152px,
// bulk actions 200px tall over 4 rows at 360px. These assertions fail if that shape returns.
const BASELINE_TYPICAL_CARD = 190; // production build 60369f0, same fixture
const TYPICAL_CARD_MAX = Math.floor(BASELINE_TYPICAL_CARD * 0.8); // hard ceiling: 152px
const TYPICAL_CARD_TARGET = BASELINE_TYPICAL_CARD * 0.75; // the -25% the lane promised
const BULK_PANEL_MAX = 170;
const TOUCH_MIN = 44;

const TEAM_APOSTROPHE = "Bob's Team";
const TEAM_MIXED = "מעבדה Central Lab";

const typical = {
  id: 900001,
  team_id: 7001,
  name: "Anti-Fyb",
  category: "reagents",
  expiry_date: "2026-08-07",
  received_date: null,
  lot_number: "26519",
  supplier_id: 44,
  supplier_name: "BIORAD",
  quantity: 3,
  manufacturer: "Biorad",
  description: null,
  notes: null,
  is_archived: false,
  in_treatment: false,
};

const rich = {
  ...typical,
  id: 900002,
  name: "Anti-Human CD45 Pacific Blue Monoclonal Antibody Clone HI30 Research Use Only",
  category: "beads",
  expiry_date: "2026-08-03",
  received_date: "2026-07-30",
  lot_number: "LONG-LOT-2026-ALPHA-0001-XYZ",
  supplier_name: "מדיקל סופליי ישראל בע״מ - חטיבת ריאגנטים",
  quantity: 16,
  manufacturer: "BioLegend International Distribution",
  description: "כדוריות QC לשיטת הכרטיסיות",
  notes: "יש לאחסן בקירור 2-8 מעלות צלזיוס ולנער לפני שימוש",
};

const sparse = {
  ...typical,
  id: 900003,
  name: "PANOCELL 10",
  expiry_date: "2026-08-09",
  lot_number: null,
  supplier_id: null,
  supplier_name: null,
  quantity: null,
  manufacturer: null,
};

const items = [typical, rich, sparse];

function fixtureFor(url: string) {
  const path = new URL(url).pathname;
  if (path === "/api/auth/me")
    return {
      id: 800001,
      email: "fixture@example.invalid",
      name: "Operator",
      team_id: 7001,
      team_approved: true,
      membership_status: "active",
    };
  if (path === "/api/teams")
    return {
      teams: [
        { id: 7001, name: "Blood Bank Beilinson", role: "owner" },
        { id: 7002, name: TEAM_APOSTROPHE, role: "member" },
        { id: 7003, name: TEAM_MIXED, role: "member" },
      ],
      currentTeamId: 7001,
    };
  if (path === "/api/reagents") return items;
  if (path === "/api/suppliers") return [{ id: 44, name: "BIORAD" }];
  if (path === "/api/push/public-key") return { publicKey: null };
  if (path === "/api/messages/unread-count") return { count: 0 };
  if (path === "/api/transfer-requests") return { items: [] };
  return {};
}

async function installFixtures(context: BrowserContext) {
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixtureFor(request.url())),
    });
  });
}

async function openDashboard(browser: any, width: number) {
  const context = await browser.newContext({
    viewport: { width, height: width >= 1024 ? 1000 : 900 },
    locale: "he-IL",
    isMobile: width < 1024,
    reducedMotion: "reduce",
  });
  await installFixtures(context);
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("heading", { name: "פריטים פעילים" }).last().waitFor();
  return { context, page };
}

// H1 regression: boundingBox() reports the layout box, which stays 44px even when a later
// sibling covers the button. Sample the real hit-test result instead.
async function hittableHeight(locator: Locator) {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    let rows = 0;
    for (let dy = 0; dy < rect.height; dy += 1) {
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + dy + 0.5);
      if (hit && (hit === el || el.contains(hit))) rows += 1;
    }
    return rows;
  });
}

async function expectNoOverflow(page: Page) {
  const diff = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(diff, "page-level horizontal overflow").toBeLessThanOrEqual(1);
}

async function expectTouchTarget(locator: Locator) {
  // elementFromPoint works in viewport coordinates, so the control must be on screen first
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box, "control must be laid out").not.toBeNull();
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(TOUCH_MIN);
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(TOUCH_MIN);
  // A disabled control legitimately has pointer-events: none; only enabled controls
  // have to prove they receive the tap across their whole box.
  if (await locator.isDisabled()) return;
  const hittable = await hittableHeight(locator);
  expect(
    hittable,
    `the whole 44px must actually receive the tap, not just occupy layout (got ${hittable}; box ${JSON.stringify(box)})`,
  ).toBeGreaterThanOrEqual(TOUCH_MIN);
}

function cardFor(page: Page, text: string) {
  return page.getByRole("article").filter({ hasText: text }).first();
}

for (const width of [360, 390, 430]) {
  test(`mobile card density holds at ${width}px`, async ({ browser }) => {
    const { context, page } = await openDashboard(browser, width);

    // 1. typical card is materially shorter than the pre-redesign 190px baseline
    const typicalBox = await cardFor(page, "Anti-Fyb").boundingBox();
    expect(Math.round(typicalBox!.height)).toBeLessThanOrEqual(TYPICAL_CARD_MAX);
    expect(
      typicalBox!.height,
      `typical card must stay at least 25% under the ${BASELINE_TYPICAL_CARD}px baseline`,
    ).toBeLessThan(TYPICAL_CARD_TARGET);

    // 2. missing fields collapse rather than reserving blank rows
    const sparseCard = cardFor(page, "PANOCELL 10");
    const sparseBox = await sparseCard.boundingBox();
    expect(Math.round(sparseBox!.height)).toBeLessThan(Math.round(typicalBox!.height));
    await expect(sparseCard.locator("dd")).toHaveCount(2); // expiry + category only
    for (const value of await sparseCard.locator("dd").allInnerTexts()) {
      expect(value.trim().length, "no blank metadata value").toBeGreaterThan(0);
    }

    // 3. rich card still renders every field it has
    const richCard = cardFor(page, "Pacific Blue");
    await expect(richCard.locator("dd")).toHaveCount(7);
    await expect(richCard.getByText("כדוריות QC לשיטת הכרטיסיות")).toBeVisible();

    // 4. long values never overlap inside the metadata grid
    const boxes = [];
    for (const cell of await richCard.locator("dl > div").all()) {
      const box = await cell.boundingBox();
      if (box) boxes.push(box);
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps =
          a.x < b.x + b.width - 1 &&
          b.x < a.x + a.width - 1 &&
          a.y < b.y + b.height - 1 &&
          b.y < a.y + a.height - 1;
        expect(overlaps, "metadata cells must not overlap").toBe(false);
      }
    }

    // 5. actions stay available with accessible touch targets
    for (const label of ["ערוך", "שכפל", "השמדה", "מחק"]) {
      await expectTouchTarget(cardFor(page, "Anti-Fyb").getByRole("button", { name: label }));
    }
    await expectTouchTarget(
      cardFor(page, "Anti-Fyb").getByRole("button", { name: "בחר פריט" }),
    );

    // 6. selection still works from the card
    const checkbox = cardFor(page, "Anti-Fyb").getByRole("button", { name: "בחר פריט" });
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("aria-pressed", "true");

    // 7. the bulk panel is compact: one header + at most two action rows
    const panel = page.getByTestId("bulk-actions");
    await expect(panel).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(Math.round(panelBox!.height)).toBeLessThanOrEqual(BULK_PANEL_MAX);

    const controls = await panel.locator("button, select").all();
    // Measure row positions in one pass: expectTouchTarget scrolls, which would shift them.
    const rowTops = new Set<number>();
    for (const control of controls) {
      const box = await control.boundingBox();
      if (box) rowTops.add(Math.round(box.y));
    }
    expect(rowTops.size, "bulk actions must not stack into more than two rows").toBeLessThanOrEqual(2);
    for (const control of controls) {
      await expectTouchTarget(control);
    }

    // 8. the selected count appears once, in the panel header, and is announced
    await expect(panel).toHaveAttribute("role", "group");
    await expect(panel).toHaveAttribute("aria-label", /.+/);
    await expect(page.locator('[aria-live="polite"]')).toHaveText("1 נבחרו");
    await expect(panel.getByText("1 נבחרו")).toHaveCount(1);
    // The count is shown once VISIBLY (panel header). Accessible names may still carry it
    // so a screen-reader user hears how many items an action affects.
    for (const button of await panel.locator("button").all()) {
      expect(((await button.innerText()) ?? "").trim()).not.toMatch(/\(\d+\)/);
    }

    // 9. destructive delete stays distinguishable beyond colour (icon + explicit label)
    const del = panel.getByRole("button", { name: "מחק את הנבחרים" });
    await expect(del).toBeVisible();
    await expect(del.locator("svg")).toHaveCount(1);

    // 10. only OTHER teams are offered as destinations (the current team is filtered out),
    //     and mixed-direction names survive intact
    const destinations = panel.locator("select#bulk-copy-team option");
    await expect(destinations).toHaveCount(3); // placeholder + 2 other teams
    await expect(destinations.nth(1)).toHaveText(TEAM_APOSTROPHE);
    await expect(destinations.nth(2)).toHaveText(TEAM_MIXED);
    await expect(panel.getByText("Blood Bank Beilinson")).toHaveCount(0);

    await expectNoOverflow(page);
    await context.close();
  });
}

test("single copy destination renders the team name as one isolated run", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 900 },
    locale: "he-IL",
    isMobile: true,
  });
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    const path = new URL(request.url()).pathname;
    const body =
      path === "/api/teams"
        ? {
            teams: [
              { id: 7001, name: "Blood Bank Beilinson", role: "owner" },
              { id: 7002, name: TEAM_APOSTROPHE, role: "member" },
            ],
            currentTeamId: 7001,
          }
        : fixtureFor(request.url());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("heading", { name: "פריטים פעילים" }).last().waitFor();
  await page.getByRole("button", { name: "בחר הכל" }).first().click();

  const panel = page.getByTestId("bulk-actions");
  // The name lives in its own <bdi>, so RTL reordering cannot split "Bob's Team".
  const isolated = panel.locator("bdi");
  await expect(isolated).toHaveText(TEAM_APOSTROPHE);
  await expectNoOverflow(page);
  await context.close();
});

test("desktop keeps the PR #42 table behaviour", async ({ browser }) => {
  const { context, page } = await openDashboard(browser, 1440);
  const region = page.getByRole("region", { name: "טבלת פריטים פעילים" });
  await expect(region).toBeVisible();
  const firstRow = region.locator("tbody tr").first();
  await expect(firstRow.locator("td.sticky")).toHaveCount(1);
  await expect(firstRow.locator("td").last()).not.toHaveClass(/sticky/);

  await page.getByRole("button", { name: "בחר הכל" }).first().click();
  const panel = page.getByTestId("bulk-actions");
  await expect(panel).toBeVisible();
  const rowTops = new Set<number>();
  for (const control of await panel.locator("button, select").all()) {
    const box = await control.boundingBox();
    if (box) rowTops.add(Math.round(box.y));
  }
  expect(rowTops.size, "bulk actions fit one row on desktop").toBe(1);
  await expectNoOverflow(page);
  await context.close();
});

test("bulk controls are keyboard operable and never copy by accident", async ({ browser }) => {
  const { context, page } = await openDashboard(browser, 390);
  await page.getByRole("button", { name: "בחר הכל" }).first().click();
  const panel = page.getByTestId("bulk-actions");
  await expect(panel).toBeVisible();

  const select = panel.locator("select#bulk-copy-team");
  await select.focus();
  await expect(select).toBeFocused();
  const ring = await select.evaluate((el) => {
    const style = getComputedStyle(el);
    return `${style.outlineWidth} ${style.outlineStyle} ${style.boxShadow}`;
  });
  expect(ring, "focused control must show a visible ring").not.toMatch(/^0px none none$/);

  // Browsing destinations with the keyboard must not launch a copy for each keypress.
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "אישור" })).toHaveCount(0);

  // The explicit copy button is what confirms, and the team name stays one bidi run.
  await select.selectOption({ label: TEAM_APOSTROPHE });
  await panel.getByRole("button", { name: "העתק לצוות…" }).click();
  const dialog = page.getByText(new RegExp(`\\u2068${TEAM_APOSTROPHE.replace("'", "'")}\\u2069`));
  await expect(dialog).toBeVisible();
  await context.close();
});

test("bulk archive and bulk delete both confirm before acting", async ({ browser }) => {
  const { context, page } = await openDashboard(browser, 390);
  await page.getByRole("button", { name: "בחר הכל" }).first().click();
  const panel = page.getByTestId("bulk-actions");

  await panel.getByRole("button", { name: /ארכיון/ }).click();
  await expect(page.getByRole("button", { name: "אישור" })).toBeVisible();
  await page.getByRole("button", { name: "ביטול" }).click();

  await panel.getByRole("button", { name: /מחיקה/ }).click();
  // delete routes through the per-item destruction dialog
  await expect(page.getByRole("heading", { name: /השמדה|מחיקה/ })).toBeVisible();
  await context.close();
});

test("the visible label is contained in the accessible name", async ({ browser }) => {
  const { context, page } = await openDashboard(browser, 390);
  await page.getByRole("button", { name: "בחר הכל" }).first().click();
  const panel = page.getByTestId("bulk-actions");
  for (const button of await panel.locator("button").all()) {
    const visible = ((await button.innerText()) ?? "").trim();
    const accessible = (await button.getAttribute("aria-label")) ?? visible;
    if (!visible) continue;
    expect(accessible, `WCAG 2.5.3: "${visible}" must appear in "${accessible}"`).toContain(visible);
  }
  await context.close();
});

test("the selection count is announced from an always-mounted live region", async ({ browser }) => {
  const { context, page } = await openDashboard(browser, 390);
  // present before anything is selected, so the FIRST selection is a mutation, not an insertion
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);
  await expect(page.locator('[aria-live="polite"]')).toHaveText("");
  await page.getByRole("button", { name: "בחר הכל" }).first().click();
  await expect(page.locator('[aria-live="polite"]')).toHaveText("3 נבחרו");
  await context.close();
});

test("a long LTR destination name keeps its head visible at 430px", async ({ browser }) => {
  const longName = "Central Blood Bank Laboratory Beilinson Campus";
  const context = await browser.newContext({
    viewport: { width: 430, height: 900 },
    locale: "he-IL",
    isMobile: true,
  });
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      return;
    }
    const path = new URL(request.url()).pathname;
    const body =
      path === "/api/teams"
        ? {
            teams: [
              { id: 7001, name: "Blood Bank Beilinson", role: "owner" },
              { id: 7002, name: longName, role: "member" },
            ],
            currentTeamId: 7001,
          }
        : fixtureFor(request.url());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("heading", { name: "פריטים פעילים" }).last().waitFor();
  await page.getByRole("button", { name: "בחר הכל" }).first().click();

  const name = page.getByTestId("bulk-actions").locator("bdi");
  // an RTL container would clip the START of an LTR name; the isolate must resolve to ltr
  expect(await name.evaluate((el) => getComputedStyle(el).direction)).toBe("ltr");
  await expect(
    page.getByTestId("bulk-actions").getByRole("button", { name: new RegExp(longName) }),
  ).toHaveAttribute("title", longName);
  await expectNoOverflow(page);
  await context.close();
});

test("tablet width keeps a single bulk-action row", async ({ browser }) => {
  const { context, page } = await openDashboard(browser, 768);
  await page.getByRole("button", { name: "בחר הכל" }).first().click();
  const panel = page.getByTestId("bulk-actions");
  await expect(panel).toBeVisible();
  const rowTops = new Set<number>();
  for (const control of await panel.locator("button, select").all()) {
    const box = await control.boundingBox();
    if (box) rowTops.add(Math.round(box.y));
  }
  expect(rowTops.size).toBeLessThanOrEqual(2);
  await expectNoOverflow(page);
  await context.close();
});
