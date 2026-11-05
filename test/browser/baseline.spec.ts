import { expect, test, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SCREENSHOT_CLOCK_UTC } from "../../src/config/decisions";
import { compareReviewImages } from "./compare-review-images.mjs";

// Approved v18 is the live visual oracle. v17 images are historical only.
const diagnosticBase = process.env.BASELINE_REVIEW_LOCALHOST;
if (diagnosticBase && !/^http:\/\/127\.0\.0\.1:\d+$/.test(diagnosticBase)) {
  throw new Error("Diagnostic transport must be an explicit loopback HTTP origin.");
}
let workbookPath = "";
let referenceUrl = "";
let productUrl = "";
test.beforeAll(async () => {
  const manifest = JSON.parse(await readFile("reference/baseline-manifest.json", "utf8"));
  referenceUrl = diagnosticBase ? `${diagnosticBase}/reference` : pathToFileURL(path.resolve(manifest.candidate.path)).href;
  productUrl = diagnosticBase ? `${diagnosticBase}/product` : pathToFileURL(path.resolve("dist/index.html")).href;
  const directory = await mkdtemp(path.join(tmpdir(), "v18-review-"));
  workbookPath = path.join(directory, "schedule.xlsx");
  await run(process.execPath, ["test/browser/write-gantt-fixture.mjs", workbookPath]);
}, { timeout: 180_000 });

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

async function open(page: Page, url: string, width: number, fixture = workbookPath): Promise<void> {
  await page.route("**/*", route => (route.request().url().startsWith("file:") || (diagnosticBase && route.request().url().startsWith(`${diagnosticBase}/`))) ? route.continue() : route.abort());
  await page.addInitScript(() => Object.defineProperty(window, "showOpenFilePicker", { configurable: true, value: undefined }));
  await page.setViewportSize({ width, height: 900 });
  await page.clock.setFixedTime(new Date(SCREENSHOT_CLOCK_UTC));
  await page.goto(url);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose workbook" }).click();
  await (await chooser).setFiles(fixture);
  await expect(page.locator("#metricTasks")).toHaveText("4");
  await page.evaluate(() => document.fonts.ready);
}

async function expand(page: Page): Promise<void> {
  await page.locator(".task-row", { hasText: "Phase" }).locator("button[data-expand]").click();
  await expect(page.getByText("Interface", { exact: true })).toBeVisible();
}

async function state(page: Page, name: string): Promise<void> {
  if (name === "gantt" || name === "gantt-day") {
    await expand(page);
    await page.locator("#columnToggle").click();
    await page.locator("#columnOptions").getByText("Type", { exact: true }).click();
    await page.locator("#columnDone").click();
    await page.locator("#calendarSettings").click();
    await page.locator("#blackoutEnabled").check();
    await page.locator("#blackoutStart").fill("2026-10-10");
    await page.locator("#blackoutEnd").fill("2026-10-12");
    await page.locator("#applyBlackout").click();
    await expect(page.locator(".blackout-overlay").first()).toBeVisible();
    if (name === "gantt-day") {
      await page.locator("[data-zoom='day']").click();
      await page.locator("#fitTop").click();
      await expect(page.locator(".pgcm-day-column").first()).toBeVisible();
    }
  } else if (name === "month" || name === "quarter") {
    await page.locator(`[data-zoom='${name}']`).click();
    await expect(page.locator(".pgcm-marker,.pgcm-day-column")).toHaveCount(0);
  } else if (name === "filtered") {
    await page.locator("#filterToggle").click();
    await page.locator("#filterStatuses").getByText("At Risk", { exact: true }).click();
    await page.locator("#filterOwners").getByText("Synthetic Owner", { exact: true }).click();
    await page.locator("#filterDone").click();
    await expect(page.locator(".task-row")).toHaveCount(3);
    await expect(page.getByText("Interface", { exact: true })).toBeVisible();
  } else if (name === "day") {
    await page.locator("[data-zoom='day']").click();
    await page.locator("#fitTop").click();
    await expect(page.locator(".pgcm-day-column").first()).toBeVisible();
  } else if (name === "week") {
    await page.locator("[data-zoom='week']").click();
    await expect(page.locator(".pgcm-week-tag").first()).toBeVisible();
  } else if (name === "three-level" || name === "detail-with-url") {
    await expand(page);
    if (name === "detail-with-url") {
      await page.getByText("Interface", { exact: true }).click();
      await expect(page.locator("a.sharepoint-link")).toHaveAttribute("href", /https:\/\/pmicloud\.sharepoint\.com\//);
    }
  } else if (name === "detail-without-url") {
    await page.getByText("Closed work", { exact: true }).click();
    await expect(page.locator(".sharepoint-link.unavailable")).toBeVisible();
  } else if (name === "filters") {
    await page.locator("#filterToggle").click();
    await expect(page.locator("#filterPopover")).toBeVisible();
    await expect(page.locator("#typeFilterGroup")).toBeHidden();
  } else if (name === "optional-columns") {
    await page.locator("#columnToggle").click();
    for (const label of ["Start", "Done", "Type", "Workstream"]) {
      await page.locator("#columnOptions").getByText(label, { exact: true }).click();
    }
    await page.locator("#columnDone").click();
  } else if (name === "blackout") {
    await page.locator("#calendarSettings").click();
    await page.locator("#blackoutEnabled").check();
    await page.locator("#blackoutStart").fill("2026-12-18");
    await page.locator("#blackoutEnd").fill("2027-01-08");
  }
}

const cases: Array<[number, string]> = [
  ...["default", "day", "week", "three-level", "detail-with-url", "detail-without-url", "filters", "optional-columns", "blackout", "month", "quarter", "filtered", "gantt", "gantt-day"].map(name => [1440, name] as [number, string]),
  ...["default", "day", "week", "detail-with-url", "blackout", "gantt"].map(name => [1024, name] as [number, string]),
];
for (const [width, name] of cases) {
  test(`v18 review ${width} ${name}: current product equals approved reference`, async ({ page, context }, testInfo) => {
    testInfo.annotations.push({ type: "deployment", description: diagnosticBase ? "localhost diagnostic; not file:// or physical Windows acceptance" : "file:// browser CI; not physical Windows 11/Edge acceptance" });
    const reference = await context.newPage();
    try {
      await open(reference, referenceUrl, width);
      await open(page, productUrl, width);
      await state(reference, name);
      await state(page, name);
      const options = { fullPage: true, animations: "disabled" as const, caret: "hide" as const, scale: "css" as const };
      const expected = await reference.screenshot(options);
      const actual = await page.screenshot(options);
      await testInfo.attach("approved-v18-reference", { body: expected, contentType: "image/png" });
      await testInfo.attach("current-product", { body: actual, contentType: "image/png" });
      const comparison = compareReviewImages(expected, actual);
      if (comparison.diff) await testInfo.attach("v18-product-diff", { body: comparison.diff, contentType: "image/png" });
      await testInfo.attach("comparison-metrics", { body: Buffer.from(JSON.stringify({ ...comparison, diff: undefined })), contentType: "application/json" });
      expect(comparison.matches, `Product differs from v18: ${comparison.differentPixels} pixels, ratio ${comparison.ratio}; approved maximum 0.001. Inspect attachments; Inspect current application conformance.`).toBe(true);
    } finally {
      await reference.close();
    }
  });
}

test("v18 Updates render read-only with safe rich text, date groups and scrolling", async ({ page }) => {
  await open(page, productUrl, 1440);
  await state(page, "detail-with-url");
  await expect(page.locator(".updates-date")).toHaveText(["Oct 25, 2026", "Oct 24, 2026"]);
  await expect(page.locator(".updates-entry")).toHaveCount(4);
  await expect(page.locator(".updates-entry").first()).toContainText("Latest update");
  await expect(page.locator(".updates-entry strong")).toHaveText("Latest update");
  await expect(page.locator(".updates-highlight")).toHaveText("Highlighted");
  await expect(page.locator(".updates-rich a")).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator("#panel")).toHaveCSS("width", "580px");
  await page.locator("#close").click();
  await page.getByText("Closed work", { exact: true }).click();
  await expect(page.locator(".updates-section")).toHaveCount(0);
});

test("v18 row ordering, full owners and linked hover preserve hierarchy", async ({ page }) => {
  await open(page, productUrl, 1440);
  await expand(page);
  await expect(page.locator(".task-row .taskname")).toHaveText(["Program", "Phase", "·Interface", "·Sign-off", "·Wireframes", "·Closed work"]);
  await expect(page.locator(".task-row .owner").first()).toHaveText("Synthetic PMO");
  await page.locator('.task-row[data-task-id="4"]').hover();
  await expect(page.locator('.timeline-row[data-task-id="4"]')).toHaveClass(/hot/);
  await page.locator('.bar[data-task-id="3"]').hover();
  await expect(page.locator('.task-row[data-task-id="3"]')).toHaveClass(/hot/);
});

test("Updates discard executable content and unsafe links; long history scrolls within the pane", async ({ page }) => {
  const directory = await mkdtemp(path.join(tmpdir(), "v18-safe-updates-"));
  const fixture = path.join(directory, "schedule.xlsx");
  await run(process.execPath, ["test/browser/write-gantt-fixture.mjs", fixture, "unsafe"]);
  page.on("dialog", () => { throw new Error("Untrusted Updates executed."); });
  await open(page, productUrl, 1440, fixture);
  await state(page, "detail-with-url");
  const rich = page.locator(".updates-rich");
  await expect(rich).toContainText("Safe & readable bold");
  await expect(rich.locator("script,img,iframe,[onclick]")).toHaveCount(0);
  await expect(rich.locator("a[href]")).toHaveCount(1);
  await expect(rich.locator("a[href]")).toHaveAttribute("href", "https://example.com/safe");
  await expect(rich.locator('[style*="url"],[style*="99px"]')).toHaveCount(0);
  const before = await page.locator("#timeScroll").evaluate(node => node.scrollTop);
  await page.locator("#panel").evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect.poll(() => page.locator("#panel").evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator("#timeScroll").evaluate(node => node.scrollTop)).toBe(before);
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).not.toHaveClass(/open/);
});

// Calibrate the capture path with the same artifact on both sides, including
// detail-panel state. This checks that rendering noise stays below the unchanged
// approved ratio before interpreting product/reference differences.
test("v18 review capture control: same reference matches itself", async ({ page, context }, testInfo) => {
  test.setTimeout(60_000);
  testInfo.annotations.push({ type: "deployment", description: diagnosticBase ? "localhost calibration only" : "file:// browser CI calibration; not physical Windows acceptance" });
  const twin = await context.newPage();
  try {
    await open(page, referenceUrl, 1440);
    await open(twin, referenceUrl, 1440);
    for (const [width, name] of [[1440,"default"],[1024,"default"],[1440,"detail-with-url"]] as Array<[number,string]>) {
      await page.setViewportSize({ width, height: 900 });
      await twin.setViewportSize({ width, height: 900 });
      await state(page, name);
      await state(twin, name);
      const options = { fullPage: true, animations: "disabled" as const, caret: "hide" as const, scale: "css" as const };
      const expected = await page.screenshot(options);
      const actual = await twin.screenshot(options);
      const comparison = compareReviewImages(expected, actual);
      await testInfo.attach(`control-${width}-${name}`, { body: Buffer.from(JSON.stringify({ ...comparison, diff: undefined })), contentType: "application/json" });
      expect(comparison.matches, `Same-reference capture control differs at ${width}/${name}, ratio ${comparison.ratio}`).toBe(true);
    }
  } finally {
    await twin.close();
  }
});
