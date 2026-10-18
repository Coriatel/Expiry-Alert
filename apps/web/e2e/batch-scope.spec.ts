import { expect, test } from "@playwright/test";

// Two active batches of one reagent: changing the quantity asks whether it is for
// this batch only or for all of them, and "all" saves every batch.
const batch = (id: number, lot: string) => ({
  id,
  team_id: 7001,
  name: "Panel 6",
  category: "reagents",
  expiry_date: "2027-03-01",
  lot_number: lot,
  quantity: 1,
  manufacturer: "Biorad",
  description: "Synthetic fixture",
  notes: "",
  is_archived: false,
  in_treatment: false,
});

test("editing quantity of one of two batches asks for scope and can save both", async ({ page }) => {
  const puts: { id: string; body: any }[] = [];
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "PUT") {
      puts.push({ id: url.pathname.split("/").pop()!, body: req.postDataJSON() });
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    const json = (() => {
      if (url.pathname === "/api/auth/me")
        return { id: 1, email: "fixture@example.invalid", name: "Fixture", team_id: 7001, team_approved: true, membership_status: "active" };
      if (url.pathname === "/api/teams") return { teams: [{ id: 7001, name: "מעבדה", role: "owner" }], currentTeamId: 7001 };
      if (url.pathname === "/api/reagents") return [batch(1, "111"), batch(2, "222")];
      if (url.pathname === "/api/suppliers") return [];
      if (url.pathname === "/api/messages/unread-count") return { count: 0 };
      if (url.pathname === "/api/transfer-requests") return { items: [] };
      return {};
    })();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const first = page.getByRole("article").first();
  await first.getByRole("button", { name: "הצג פרטים" }).click();
  await first.getByRole("button", { name: "ערוך" }).click();
  await page.locator("#edit-item-quantity").fill("3");
  await page.getByRole("button", { name: "שמור", exact: true }).click();

  await expect(page.getByRole("heading", { name: "לשנות גם בשאר האצוות?" })).toBeVisible();
  await page.getByRole("button", { name: "בשתי האצוות" }).click();

  await expect.poll(() => puts.length).toBe(2);
  const lotOf: Record<string, string> = { "1": "111", "2": "222" };
  expect(new Set(puts.map((p) => p.id))).toEqual(new Set(["1", "2"]));
  for (const p of puts) {
    expect(p.body.quantity).toBe(3);
    expect(p.body.lotNumber).toBe(lotOf[p.id]);
  }
});

test("changing only notes saves one batch without asking", async ({ page }) => {
  const puts: string[] = [];
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "PUT") {
      puts.push(url.pathname);
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    const json = url.pathname === "/api/auth/me"
      ? { id: 1, email: "fixture@example.invalid", name: "Fixture", team_id: 7001, team_approved: true, membership_status: "active" }
      : url.pathname === "/api/teams"
        ? { teams: [{ id: 7001, name: "מעבדה", role: "owner" }], currentTeamId: 7001 }
        : url.pathname === "/api/reagents"
          ? [batch(1, "111"), batch(2, "222")]
          : url.pathname === "/api/suppliers" ? [] : {};
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const first = page.getByRole("article").first();
  await first.getByRole("button", { name: "הצג פרטים" }).click();
  await first.getByRole("button", { name: "ערוך" }).click();
  await page.getByLabel("הערות").fill("יגיע מחר חדש");
  await page.getByRole("button", { name: "שמור", exact: true }).click();
  await expect.poll(() => puts.length).toBe(1);
  await expect(page.getByRole("heading", { name: "לשנות גם בשאר האצוות?" })).toHaveCount(0);
});
