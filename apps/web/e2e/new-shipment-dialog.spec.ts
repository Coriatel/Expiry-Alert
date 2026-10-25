import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// Density regression for the active-items mobile view.
// Baseline (production build 60369f0, same fixture): typical card 190px, sparse 152px,
// bulk actions 200px tall over 4 rows at 360px. These assertions fail if that shape returns.
// (fixtures copied from mobile-density.spec.ts) Owner, 2026-10-14: a card shows name, expiry, duplicate, delete and a toggle; the rest
// opens on request. (The pre-redesign card on this fixture was 190px, build 60369f0.)
const CLOSED_CARD_MAX = 72;
const BULK_PANEL_MAX = 170;

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


async function expectNoOverflow(page: Page) {
  const diff = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(diff, "page-level horizontal overflow").toBeLessThanOrEqual(1);
}

// Owner, 2026-10-25: the new-shipment dialog was lopsided on a phone (a one-column grid with
// col-span-2 children grew an auto column), and a barcode could only be read by the camera.
for (const width of [360, 390, 430]) {
  test(`new-shipment dialog has two equal columns and reads a typed barcode at ${width}px`, async ({ browser }) => {
    const { context, page } = await openDashboard(browser, width);
    await page.getByRole("article").filter({ hasText: "PANOCELL" }).first()
      .getByRole("button", { name: "שכפל" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("heading", { name: "משלוח חדש" }).waitFor();

    const lotBox = (await dialog.locator("input").nth(0).boundingBox())!;
    const dateBox = (await dialog.locator("input[inputmode=numeric]").first().boundingBox())!;
    const qtyBox = (await dialog.locator("input[type=number]").boundingBox())!;
    expect(Math.abs(lotBox.width - qtyBox.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(lotBox.y - dateBox.y)).toBeLessThanOrEqual(2);
    expect(dateBox.width).toBeGreaterThan(lotBox.width * 0.8);
    await expectNoOverflow(page);
    await page.screenshot({ path: `test-results/new-shipment-${width}.png`, fullPage: false });

    await dialog.getByRole("button", { name: "סרוק מדבקה" }).click();
    const typed = page.getByLabel("או הקלד את מספרי הברקוד");
    await typed.fill("hello");
    await page.getByRole("button", { name: "קרא", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "לא נמצאו" }).waitFor();
    await page.screenshot({ path: `test-results/typed-barcode-${width}.png` });
    await typed.fill("(10)112062(17)261120");
    await typed.press("Enter");
    await expect(typed).toBeHidden();
    await expect(dialog.locator("input").nth(0)).toHaveValue("112062");
    await expect(dialog.locator("input[inputmode=numeric]").first()).toHaveValue("20.11.2026");
    await context.close();
  });
}
