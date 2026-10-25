import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { chromium, expect, test, type Page } from "@playwright/test";

let fileUrl = "";
let schedulePath = "";
let samplePath = "";
let rows500 = "";
let rows2000 = "";

test.beforeAll(async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gantt-release-"));
  schedulePath = path.join(directory, "schedule.xlsx");
  rows500 = path.join(directory, "rows-500.xlsx");
  rows2000 = path.join(directory, "rows-2000.xlsx");
  samplePath = path.resolve("reference/data-source.xlsx");
  await Promise.all([
    run(process.execPath, ["test/browser/write-gantt-fixture.mjs", schedulePath]),
    run(process.execPath, ["test/browser/write-stress-fixture.mjs", rows500, "500"]),
    run(process.execPath, ["test/browser/write-stress-fixture.mjs", rows2000, "2000"]),
    run("npm", ["run", "build"]),
  ]);
  const names = await readdir("dist");
  expect(names.filter((name) => name.endsWith(".js") || name.endsWith(".css"))).toEqual([]);
  const html = await readFile("dist/index.html");
  const hash = createHash("sha256").update(html).digest("hex");
  expect((await readFile("dist/SHA256.txt", "utf8")).startsWith(hash)).toBe(true);
  console.log(`dist/index.html SHA-256 ${hash}`);
  fileUrl = pathToFileURL(path.resolve("dist/index.html")).href;
}, { timeout: 180_000 });

test("keyboard, disabled links, and offline open work from the built file", async ({ page }) => {
  test.setTimeout(60_000);
  const requests = await openBuilt(page, schedulePath);
  await expect(page.locator("#metricTasks")).toHaveText("4");
  expect(requests.some((url) => url.startsWith("http"))).toBe(false);

  await page.locator(".task-row").first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".task-row").nth(1)).toBeFocused();
  await page.locator(".task-row").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".panel-title")).toHaveText("Program");
  await expect(page.locator("#close")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).not.toHaveClass(/open/);
  await expect(page.locator(".task-row").first()).toBeFocused();

  await page.locator(".task-row", { hasText: "Phase" }).locator("button[data-expand]").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Wireframes", { exact: true })).toBeVisible();
  await page.locator(".bar[aria-label*='Interface']").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#close")).toBeFocused();
  const href = await page.locator("a.sharepoint-link").getAttribute("href");
  expect(href && new URL(href).hostname).toBe("pmicloud.sharepoint.com");
  await page.keyboard.press("Tab");
  await expect(page.locator("a.sharepoint-link")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#close")).toBeFocused();
  await page.keyboard.press("Escape");

  await page.locator(".task-row", { hasText: "Closed work" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("a.sharepoint-link")).toHaveCount(0);
  await expect(page.locator(".sharepoint-link.unavailable")).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");

  for (const [button, popover] of [
    ["#filterToggle", "#filterPopover"],
    ["#columnToggle", "#columnPopover"],
    ["#calendarSettings", "#calendarPopover"],
  ] as const) {
    await page.locator(button).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(popover)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(popover)).toBeHidden();
  }

  const before = await page.locator("#gantt").evaluate((node) => Number.parseFloat(getComputedStyle(node).getPropertyValue("--grid")));
  await page.locator("#resize").focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => page.locator("#gantt").evaluate((node) => Number.parseFloat(node.style.getPropertyValue("--grid")))).toBe(before + 16);
});

test("opens the sanitized sample export offline", async ({ page }) => {
  await openBuilt(page, samplePath);
  await expect(page.locator("#metricTasks")).toHaveText("22");
  await expect(page.locator(".task-row")).toHaveCount(36);
  await page.locator(".task-row").first().focus();
  await page.keyboard.press("Enter");
  const href = await page.locator("a.sharepoint-link").getAttribute("href");
  expect(href && new URL(href).hostname).toBe("pmicloud.sharepoint.com");
  await expect(page.locator("a.sharepoint-link")).toHaveAttribute("rel", "noopener noreferrer");
});

test("renders 500 synthetic rows", async ({ page }) => {
  test.setTimeout(60_000);
  const elapsed = await timeOpen(page, rows500, "500");
  expect(elapsed).toBeLessThan(15_000);
  console.log(`500 rows rendered in ${elapsed}ms`);
});

test("renders 2000 synthetic rows", async ({ page }) => {
  test.setTimeout(90_000);
  const elapsed = await timeOpen(page, rows2000, "2000");
  expect(elapsed).toBeLessThan(20_000);
  const last = page.locator(".task-row").last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toContainText("Synthetic 2000");
  console.log(`2000 rows rendered in ${elapsed}ms`);
});

test("Chrome opens the built file", async () => {
  await smokeChannel("chrome", schedulePath);
});

test("Edge opens the built file", async () => {
  await smokeChannel("msedge", schedulePath);
});

async function smokeChannel(channel: "chrome" | "msedge", workbook: string): Promise<void> {
  let browser;
  try {
    browser = await chromium.launch({ channel });
  } catch (error) {
    test.skip(true, error instanceof Error ? error.message : `${channel} is not installed`);
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await openBuilt(page, workbook);
    await expect(page.locator("#title")).toHaveText("schedule");
    await expect(page.locator("#metricTasks")).toHaveText("4");
  } finally {
    await browser.close();
  }
}

async function timeOpen(page: Page, workbook: string, count: string): Promise<number> {
  await prepare(page);
  const started = Date.now();
  await choose(page, workbook);
  await expect(page.locator("#metricTasks")).toHaveText(count);
  await expect(page.locator(".task-row")).toHaveCount(Number(count));
  return Date.now() - started;
}

async function openBuilt(page: Page, workbook: string): Promise<string[]> {
  const requests = await prepare(page);
  await choose(page, workbook);
  return requests;
}

async function prepare(page: Page): Promise<string[]> {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("dialog", () => {
    throw new Error("Excel text was executed.");
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "showOpenFilePicker", { configurable: true, value: undefined });
  });
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:")) void route.continue();
    else void route.abort();
  });
  await page.goto(fileUrl);
  await expect(page.locator("h1")).toHaveText("Gantt Viewer");
  return requests;
}

async function choose(page: Page, workbook: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose workbook" }).click();
  await (await chooser).setFiles(workbook);
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), stdio: "inherit", shell: command === "npm" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}
