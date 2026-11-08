import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * DES-010 design-only Chromium review. Source: design/concepts/DES-010-gantt-local-scope.html.
 * This does NOT validate the Excel Managed Variant, actual Edge, workbook I/O,
 * owner visual acceptance, accessibility conformance, or implementation readiness.
 * Screenshots are attached as non-golden review evidence.
 */
const prototypeUrl = pathToFileURL(path.resolve("design/concepts/DES-010-gantt-local-scope.html")).href;

async function openPrototype(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.route("**/*", route => route.request().url().startsWith("file:") ? route.continue() : route.abort());
  await page.goto(prototypeUrl);
  await expect(page.locator("#navB")).toHaveClass(/active/);
  await page.evaluate(() => document.fonts.ready);
}

async function rect(page: Page, selector: string) {
  return page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  });
}

async function capture(page: Page, testInfo: { attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void> }, name: string) {
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: false, animations: "disabled" }), contentType: "image/png" });
}

for (const [width, height] of [[1366, 768], [1024, 768], [1440, 900]] as const) {
  test(`DES-010 ${width}×${height}: stable global nav, inspector geometry and local Gantt scope`, async ({ page }, testInfo) => {
    await openPrototype(page, width, height);
    const firstNav = await Promise.all(["#navA", "#navB", "#navL"].map(s => rect(page, s)));
    const meetingDetail = await rect(page, ".b-layout .detail-compact");
    await capture(page, testInfo, `meeting-${width}x${height}`);

    await page.locator("#navA").click();
    const ganttPanel = page.locator(".a-layout > .panel").first();
    const scope = ganttPanel.locator(".panelhead .gantt-scope-controls");
    await expect(scope).toBeVisible();
    await expect(page.locator("header.top [data-stage]")).toHaveCount(0);
    await expect(scope.locator('[data-stage="exception"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".schedule-row")).toHaveCount(3);
    const scheduleDetail = await rect(page, ".a-layout .detail-compact");
    expect(Math.abs(meetingDetail.width - scheduleDetail.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(meetingDetail.height - scheduleDetail.height)).toBeLessThanOrEqual(3);
    expect(Math.abs(meetingDetail.x - scheduleDetail.x)).toBeLessThanOrEqual(2);

    for (const [i, selector] of ["#navA", "#navB", "#navL"].entries()) {
      const actual = await rect(page, selector);
      expect(Math.abs(actual.x - firstNav[i].x), selector).toBeLessThanOrEqual(2);
    }
    await scope.locator('[data-stage="workstream"]').click();
    await expect(page.locator(".schedule-row")).toHaveCount(11);
    await expect(scope.locator('[data-stage="workstream"]')).toHaveAttribute("aria-pressed", "true");
    await capture(page, testInfo, `schedule-workstreams-${width}x${height}`);
    await scope.locator('[data-stage="exception"]').click();
    await expect(page.locator(".schedule-row")).toHaveCount(3);

    await page.locator("#navL").click();
    await expect(page.locator("#reportContentScroll")).toBeVisible();
    for (const [i, selector] of ["#navA", "#navB", "#navL"].entries()) {
      const actual = await rect(page, selector);
      expect(Math.abs(actual.x - firstNav[i].x), selector).toBeLessThanOrEqual(2);
    }
    await capture(page, testInfo, `latest-report-${width}x${height}`);
  });
}

test("DES-010 1366×768: task list scroll contained and selected detail stays anchored", async ({ page }, testInfo) => {
  await openPrototype(page, 1366, 768);
  await page.locator('[data-filter="all"]').click();
  await expect(page.locator(".meeting-item")).toHaveCount(11);
  const scroller = page.locator("#meetingListScroll");
  const before = await rect(page, ".b-layout .detail-compact");
  const viewport = await scroller.evaluate(el => ({ visible: el.clientHeight, content: el.scrollHeight }));
  expect(viewport.content, "11-task list must overflow in laptop meeting workspace").toBeGreaterThan(viewport.visible);
  await scroller.evaluate(el => { el.scrollTop = 180; });
  await expect.poll(async () => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const after = await rect(page, ".b-layout .detail-compact");
  expect(after.y).toBeCloseTo(before.y, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await capture(page, testInfo, "meeting-all-workstreams-scroll-contained");
});

test("DES-010 1366×768: Reports scroll inside body, toolbar and app nav stay fixed", async ({ page }, testInfo) => {
  await openPrototype(page, 1366, 768);
  await page.locator("#navL").click();
  await page.locator('[data-report="updates"]').click();
  await expect(page.locator("#reportContentScroll")).toBeVisible();
  const toolbar = page.locator(".reportbar").first();
  const before = await toolbar.boundingBox();
  const report = page.locator("#reportContentScroll");
  const sizes = await report.evaluate(el => ({ visible: el.clientHeight, content: el.scrollHeight }));
  expect(sizes.content, "report content should exceed the scroll pane in the laptop layout").toBeGreaterThan(sizes.visible);
  await report.evaluate(el => { el.scrollTop = 240; });
  await expect.poll(async () => report.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const after = await toolbar.boundingBox();
  expect(after?.y).toBeCloseTo(before?.y ?? 0, 0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await capture(page, testInfo, "reports-scrolling-with-fixed-toolbar");
});

test("DES-010: Settings and History are reachable from narrow laptop widths", async ({ page }, testInfo) => {
  for (const width of [1440, 1024, 860]) {
    await openPrototype(page, width, 768);
    const settings = page.locator("#settingsButton");
    await expect(settings, `Settings must be discoverable at ${width}px`).toBeVisible();
    await settings.click();
    await expect(page.locator("#drawerHost")).toHaveClass(/open/);
    await expect(page.locator("#drawerContents")).toContainText("Display timezone");
    await page.locator('[data-drawer-tab="history"]').click();
    await expect(page.locator(".history-log-row")).toHaveCount(3);
    await capture(page, testInfo, `settings-history-drawer-${width}`);
    await page.locator("#drawerClose").click();
  }
});

test("DES-010: unsaved task draft cannot be lost by switching Gantt scope", async ({ page }) => {
  await openPrototype(page, 1366, 768);
  await page.locator("#navA").click();
  await page.locator("#meetingEdit").click();
  await page.locator("#owner").fill("Changed Owner (synthetic)");
  await page.locator('.gantt-scope-controls [data-stage="workstream"]').click();
  await expect(page.locator("#overlayShell")).not.toHaveClass(/hide/);
  await expect(page.getByRole("button", { name: /Cancel · keep editing/ })).toBeVisible();
  await page.locator("#dirtyCancel").click();
  await expect(page.locator('.gantt-scope-controls [data-stage="exception"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#owner")).toHaveValue("Changed Owner (synthetic)");
  await page.locator('.gantt-scope-controls [data-stage="workstream"]').click();
  await page.locator("#dirtyDiscard").click();
  await expect(page.locator("#overlayShell")).toHaveClass(/hide/);
  await expect(page.locator('.gantt-scope-controls [data-stage="workstream"]')).toHaveAttribute("aria-pressed", "true");
});

test("DES-010: Update Report has eight inclusive dates and a fixed preview", async ({ page }) => {
  await openPrototype(page, 1366, 768);
  await page.locator("#navL").click();
  await page.locator('[data-report="updates"]').click();
  await page.locator('[data-display="preview"]').click();
  await expect(page.locator("#periodStart")).toHaveValue("2026-11-02");
  await expect(page.locator("#periodEnd")).toHaveValue("2026-11-09");
  await expect(page.locator(".preview-shell pre")).toContainText("Reporting period: 2026-11-02 to 2026-11-09 inclusive");
  await page.locator("#periodStart").fill("2026-11-06");
  await expect(page.locator(".preview-shell pre")).toContainText("Reporting period: 2026-11-02 to 2026-11-09 inclusive");
  await page.locator("#refreshReport").click();
  await expect(page.locator(".preview-shell pre")).toContainText("Reporting period: 2026-11-06 to 2026-11-09 inclusive");
});
