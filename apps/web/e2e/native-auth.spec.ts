import { expect, test } from "@playwright/test";

test("first service-worker activation does not abort native login", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "he-IL",
  });
  const page = await context.newPage();
  let loginFailure: string | null = null;
  let loginStatus: number | null = null;
  let mainFrameNavigations = 0;

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) mainFrameNavigations += 1;
  });

  page.on("requestfailed", (request) => {
    if (request.url().endsWith("/api/auth/login")) {
      loginFailure = request.failure()?.errorText ?? "unknown";
    }
  });
  page.on("response", (response) => {
    if (response.url().endsWith("/api/auth/login")) {
      loginStatus = response.status();
    }
  });

  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/auth/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "null",
      });
      return;
    }
    if (path === "/api/auth/login") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "set-cookie":
            "expiryalert.sid=synthetic; Path=/; HttpOnly; Secure; SameSite=Lax",
        },
        body: JSON.stringify({
          id: 990001,
          email: "synthetic-native@example.invalid",
          name: "Synthetic Native",
          team_id: null,
          needsTeam: true,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unauthorized" }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="email"]').fill("synthetic-native@example.invalid");
  await page.locator('input[type="password"]').fill("SyntheticNative#2026");
  await page.locator("form").evaluate((form) => form.requestSubmit());
  await page.waitForTimeout(1_000);

  expect(loginFailure).toBeNull();
  expect(loginStatus).toBe(200);
  expect(mainFrameNavigations).toBe(1);
  await expect(page.getByText("Failed to fetch")).toHaveCount(0);
  await context.close();
});
