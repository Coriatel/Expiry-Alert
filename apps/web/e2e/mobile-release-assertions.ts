import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

export async function assertNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, "document must not overflow the viewport").toBeLessThanOrEqual(
    dimensions.viewport,
  );
  expect(dimensions.body, "body must not overflow the viewport").toBeLessThanOrEqual(
    dimensions.viewport,
  );
}

export async function assertMinimumTouchTarget(locator: Locator, minimum = 44) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  expect(bounds, "touch target must have rendered bounds").not.toBeNull();
  expect(bounds!.width, "touch target width").toBeGreaterThanOrEqual(minimum);
  expect(bounds!.height, "touch target height").toBeGreaterThanOrEqual(minimum);
}

export async function assertNotClipped(locator: Locator) {
  await expect(locator).toBeVisible();
  const result = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = {
      left: 0,
      top: 0,
      right: document.documentElement.clientWidth,
      bottom: window.innerHeight,
    };
    const failures: string[] = [];

    if (rect.left < viewport.left - 1 || rect.right > viewport.right + 1) {
      failures.push("outside viewport horizontally");
    }

    let ancestor = element.parentElement;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      const clipsX = ["hidden", "clip"].includes(style.overflowX);
      const clipsY = ["hidden", "clip"].includes(style.overflowY);
      if (clipsX || clipsY) {
        const parentRect = ancestor.getBoundingClientRect();
        if (clipsX && (rect.left < parentRect.left - 1 || rect.right > parentRect.right + 1)) {
          failures.push("clipped horizontally by ancestor");
        }
        if (clipsY && (rect.top < parentRect.top - 1 || rect.bottom > parentRect.bottom + 1)) {
          failures.push("clipped vertically by ancestor");
        }
      }
      ancestor = ancestor.parentElement;
    }

    return failures;
  });
  expect(result, "critical element must not be clipped").toEqual([]);
}

export async function assertVisibleFocus(locator: Locator) {
  await expect(locator).toBeFocused();
  const focusStyle = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle !== "none" && style.outlineWidth !== "0px",
      ring: style.boxShadow !== "none",
    };
  });
  expect(
    focusStyle.outline || focusStyle.ring,
    "keyboard focus must have a visible outline or ring",
  ).toBe(true);
}

export async function assertScrollableRegionReachable(locator: Locator) {
  await expect(locator).toBeVisible();
  const result = await locator.evaluate((element) => {
    const initial = element.scrollLeft;
    const overflow = element.scrollWidth > element.clientWidth + 1;
    element.scrollLeft = element.scrollWidth;
    const positive = element.scrollLeft;
    element.scrollLeft = -element.scrollWidth;
    const negative = element.scrollLeft;
    element.scrollLeft = initial;
    return { overflow, initial, positive, negative };
  });
  expect(result.overflow, "table region must expose deliberate horizontal scrolling").toBe(true);
  expect(
    result.positive !== result.initial || result.negative !== result.initial,
    "hidden columns must be reachable by scrolling",
  ).toBe(true);
}

export async function attachRenderedEvidence(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  const foldPath = testInfo.outputPath(`${name}-fold.png`);
  const fullPath = testInfo.outputPath(`${name}-full.png`);
  await page.screenshot({
    path: foldPath,
    fullPage: false,
    animations: "disabled",
  });
  await page.screenshot({
    path: fullPath,
    fullPage: true,
    animations: "disabled",
  });
  await testInfo.attach(`${name}-fold`, {
    path: foldPath,
    contentType: "image/png",
  });
  await testInfo.attach(`${name}-full`, {
    path: fullPath,
    contentType: "image/png",
  });
}
