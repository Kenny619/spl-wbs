import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SCREENSHOT_CLOCK_UTC } from "../../src/config/decisions";

const baselineUrl = pathToFileURL(
  path.resolve("reference/UI_BASELINE_v17_FROZEN.html"),
).href;

async function openBaseline(page: Page, width: number): Promise<void> {
  await page.route("**/*", (route) => {
    if (route.request().url().startsWith("file:")) {
      return route.continue();
    }
    return route.abort();
  });
  await page.setViewportSize({ width, height: 900 });
  await page.clock.setFixedTime(new Date(SCREENSHOT_CLOCK_UTC));
  await page.goto(baselineUrl);
  await page.waitForFunction(
    () => document.querySelector("#metricTasks")?.textContent === "17",
  );
  await page.evaluate(() => document.fonts.ready);
  const iso = await page.evaluate(() => new Date(Date.now()).toISOString().slice(0, 10));
  expect(iso).toBe("2026-10-25");
}

async function showDay(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".pgcm-day-column").first()).toBeVisible();
}

async function showWeek(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".pgcm-week-tag").first()).toBeVisible();
}

test("1440 default fit view", async ({ page }) => {
  await openBaseline(page, 1440);
  await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page).toHaveScreenshot("1440-default.png");
});

test("1440 day PGCM column", async ({ page }) => {
  await openBaseline(page, 1440);
  await showDay(page);
  await expect(page).toHaveScreenshot("1440-day-pgcm.png");
});

test("1440 week PGCM marker", async ({ page }) => {
  await openBaseline(page, 1440);
  await showWeek(page);
  await expect(page).toHaveScreenshot("1440-week-pgcm.png");
});

test("1440 three-level WBS", async ({ page }) => {
  await openBaseline(page, 1440);
  const levelThree = page.getByText("High fidelity UI design", { exact: true });
  await levelThree.scrollIntoViewIfNeeded();
  await expect(levelThree).toBeVisible();
  await expect(page).toHaveScreenshot("1440-three-level.png");
});

test("1440 detail with ItemURL", async ({ page }) => {
  await openBaseline(page, 1440);
  await page.getByText("High fidelity UI design", { exact: true }).click();
  await expect(page.locator(".detail-panel.open")).toBeVisible();
  await expect(page.locator(".sharepoint-link")).toHaveAttribute(
    "href",
    "https://example.com/sample-sharepoint-item",
  );
  await expect(page).toHaveScreenshot("1440-detail-with-url.png");
});

test("1440 detail without ItemURL", async ({ page }) => {
  await openBaseline(page, 1440);
  await page.getByText("Project charter", { exact: true }).click();
  await expect(page.locator(".detail-panel.open")).toBeVisible();
  await expect(page.locator(".sharepoint-link.unavailable")).toBeVisible();
  await expect(page).toHaveScreenshot("1440-detail-without-url.png");
});

test("1440 filters", async ({ page }) => {
  await openBaseline(page, 1440);
  await page.locator("#filterToggle").click();
  await expect(page.locator("#filterPopover")).toBeVisible();
  await expect(page.locator("#typeFilterGroup")).toBeHidden();
  await expect(page.locator("#workstreamFilterGroup")).toBeHidden();
  await expect(page).toHaveScreenshot("1440-filters.png");
});

test("1440 optional columns", async ({ page }) => {
  await openBaseline(page, 1440);
  await page.locator("#columnToggle").click();
  const popover = page.locator("#columnPopover");
  await expect(popover).toBeVisible();
  const options = popover.locator("#columnOptions");
  for (const label of ["Start", "Done", "Type", "Workstream"]) {
    await options.getByText(label, { exact: true }).click();
  }
  await page.locator("#columnDone").click();
  await expect(popover).toBeHidden();
  await expect(page).toHaveScreenshot("1440-optional-columns.png");
});

test("1440 blackout dialog", async ({ page }) => {
  await openBaseline(page, 1440);
  await page.locator("#calendarSettings").click();
  await expect(page.locator("#calendarPopover")).toBeVisible();
  await expect(page.locator("#blackoutStart")).toHaveValue("2026-12-18");
  await expect(page.locator("#blackoutEnd")).toHaveValue("2027-01-08");
  await expect(page).toHaveScreenshot("1440-blackout.png");
});

test("1024 default fit view", async ({ page }) => {
  await openBaseline(page, 1024);
  await expect(page).toHaveScreenshot("1024-default.png");
});

test("1024 day PGCM column", async ({ page }) => {
  await openBaseline(page, 1024);
  await showDay(page);
  await expect(page).toHaveScreenshot("1024-day-pgcm.png");
});

test("1024 week PGCM marker", async ({ page }) => {
  await openBaseline(page, 1024);
  await showWeek(page);
  await expect(page).toHaveScreenshot("1024-week-pgcm.png");
});

test("1024 detail with ItemURL", async ({ page }) => {
  await openBaseline(page, 1024);
  await page.getByText("High fidelity UI design", { exact: true }).click();
  await expect(page.locator(".detail-panel.open")).toBeVisible();
  await expect(page).toHaveScreenshot("1024-detail-with-url.png");
});

test("1024 blackout dialog", async ({ page }) => {
  await openBaseline(page, 1024);
  await page.locator("#calendarSettings").click();
  await expect(page.locator("#calendarPopover")).toBeVisible();
  await expect(page).toHaveScreenshot("1024-blackout.png");
});
