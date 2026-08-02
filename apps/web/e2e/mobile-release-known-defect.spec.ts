import { test } from "@playwright/test";
import {
  assertMinimumTouchTarget,
  assertNoPageOverflow,
  assertNotClipped,
} from "./mobile-release-assertions";

test.skip(
  process.env.MOBILE_RELEASE_NEGATIVE_CONTROL !== "1",
  "Runs only as the expected-failure bite check",
);

test("negative control rejects page-level horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.setContent('<main style="width: 520px">known overflow</main>');
  await assertNoPageOverflow(page);
});

test("negative control rejects an undersized primary touch target", async ({ page }) => {
  await page.setContent(
    '<button data-testid="small-primary" style="width: 24px;height: 24px">Save</button>',
  );
  await assertMinimumTouchTarget(page.getByTestId("small-primary"));
});

test("negative control rejects clipped critical content", async ({ page }) => {
  await page.setContent(
    '<div style="width: 120px;overflow:hidden"><p data-testid="clipped" style="width:300px;white-space:nowrap">Critical content must remain reachable</p></div>',
  );
  await assertNotClipped(page.getByTestId("clipped"));
});
