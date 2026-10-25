import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { SCREENSHOT_CLOCK_UTC } from "../../src/config/decisions";

let server: ViteDevServer;
let baseURL = "";
let workbookPath = "";

test.beforeAll(async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gantt-view-"));
  workbookPath = path.join(directory, "schedule.xlsx");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve("test/browser/write-gantt-fixture.mjs"), workbookPath], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`fixture writer exited ${code}`))));
  });
  server = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("The Gantt server did not listen.");
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await server?.close();
});

test("draws an imported three-level schedule", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("dialog", () => {
    throw new Error("Excel text was executed.");
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "showOpenFilePicker", { configurable: true, value: undefined });
  });
  await page.clock.setFixedTime(new Date(SCREENSHOT_CLOCK_UTC));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseURL);
  await expect(page.locator("h1")).toHaveText("Gantt Viewer");
  await expect(page.getByText("Digital Transformation Program")).toHaveCount(0);
  await expect(page.locator("#metricTasks")).toHaveText("—");

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose workbook" }).click();
  await (await chooser).setFiles(workbookPath);
  await expect(page.locator("#title")).toHaveText("schedule");
  await expect(page.locator("#metricTasks")).toHaveText("4");
  await expect(page.locator("#metricMilestones")).toHaveText("1");
  await expect(page.locator(".task-row")).toHaveCount(3);
  await expect(page.locator(".bar").first()).toBeVisible();

  await page.locator(".task-row", { hasText: "Phase" }).locator("button[data-expand]").click();
  await expect(page.getByText("Wireframes", { exact: true })).toBeVisible();
  await expect(page.getByText("Interface", { exact: true })).toBeVisible();
  await page.locator(".task-row", { hasText: "Interface" }).click();
  await expect(page.locator(".panel-title")).toHaveText("Interface");
  await expect(page.locator(".desc").first()).toHaveText("<script>alert(1)</script>");
  await expect(page.locator(".workdays-detail strong")).toHaveText("8 workdays remaining");
  const link = page.locator("a.sharepoint-link");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAttribute("target", "_blank");
  const href = await link.getAttribute("href");
  expect(href && new URL(href).hostname).toBe("pmicloud.sharepoint.com");

  await page.locator("#close").click();
  await page.locator(".task-row", { hasText: "Closed work" }).click();
  await expect(page.locator("a.sharepoint-link")).toHaveCount(0);
  await expect(page.locator(".sharepoint-link.unavailable")).toBeVisible();
  await expect(page.locator(".workdays-detail")).toHaveCount(0);

  await page.locator("#close").click();
  await page.getByRole("button", { name: "Filters", exact: false }).click();
  await page.locator("#filterStatuses").getByText("At Risk", { exact: true }).click();
  await page.locator("#filterDone").click();
  await expect(page.locator(".task-row", { hasText: "Interface" })).toBeVisible();
  await expect(page.locator(".task-row", { hasText: "Closed work" })).toHaveCount(0);

  await page.getByRole("button", { name: "Clear all filters" }).click();
  await page.locator("#columnToggle").click();
  await page.locator("#columnOptions").getByText("Type", { exact: false }).click();
  await page.locator("#columnDone").click();
  await expect(page.locator(".grid-header")).toContainText("Type");

  await page.locator("#calendarSettings").click();
  await expect(page.locator("#calendarPopover")).toBeVisible();
  await page.locator("#blackoutEnabled").check();
  await page.locator("#blackoutStart").fill("2026-10-10");
  await page.locator("#blackoutEnd").fill("2026-10-12");
  await page.locator("#applyBlackout").click();
  await expect(page.locator(".blackout-overlay").first()).toBeVisible();
  await expect(page.locator(".pgcm-week-tag")).toHaveCount(1);
  await expect(page.locator(".pgcm-marker")).toHaveAttribute("title", "PGCM · Oct 26, 2026");
  await expect(page.locator(".holiday-overlay[title='スポーツの日']")).toHaveCount(1);
  await expect(page.locator("#holidayCoverage")).toContainText("provisional offline table");
  expect(requests.some((url) => url.includes("holidays-jp.github.io") || url.includes("sharepoint.com"))).toBe(false);
  await expect(page).toHaveScreenshot("gantt-1440.png", { fullPage: true });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page).toHaveScreenshot("gantt-1024.png", { fullPage: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-zoom='day']").click();
  await page.locator("#fitTop").click();
  await expect(page.locator(".pgcm-day-column").first()).toBeVisible();
  await expect(page.locator(".pgcm-tag")).toHaveCount(1);
  await expect(page).toHaveScreenshot("gantt-1440-day-pgcm.png", { fullPage: true });

  await page.locator("#calendarSettings").click();
  await page.locator("#blackoutStart").fill("2026-10-26");
  await page.locator("#blackoutEnd").fill("2026-10-26");
  await page.locator("#applyBlackout").click();
  await expect(page.locator(".pgcm-day-column")).toHaveCount(0);
  await expect(page.locator(".pgcm-tag")).toHaveCount(0);

  await page.locator("[data-zoom='month']").click();
  await expect(page.locator(".pgcm-marker, .pgcm-day-column, .pgcm-tag, .pgcm-week-tag, .holiday-overlay")).toHaveCount(0);
});
