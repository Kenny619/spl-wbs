import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer, type ViteDevServer } from "vite";

let server: ViteDevServer;
let baseURL = "";
let goodPath = "";
let badPath = "";

test.beforeAll(async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gantt-chooser-"));
  goodPath = path.join(directory, "phase-two.xlsx");
  badPath = path.join(directory, "broken.xlsx");
  await writeGoodWorkbook(goodPath);
  await writeFile(badPath, "this is not a workbook");
  server = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("The chooser server did not listen.");
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await server?.close();
});

function writeGoodWorkbook(target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve("test/browser/write-fixture.mjs"), target], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Workbook fixture writer exited ${code}.`));
    });
  });
}

test("choose, failed change, and forget stay on the last good workbook", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    Object.defineProperty(window, "showOpenFilePicker", { configurable: true, value: undefined });
  });
  await page.goto(baseURL);
  await expect(page.locator("#eyebrow")).toHaveText("Portfolio / Project Delivery");
  await expect(page.locator("#subtitle")).toHaveText("Project schedule overview · WBS visualization");
  await expect(page.locator("#title")).toHaveText("Gantt Viewer");
  await expect(page.locator("#reconnect")).toBeHidden();

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose workbook" }).click();
  await (await chooser).setFiles(goodPath);
  await expect(page.locator("#title")).toHaveText("phase-two");
  await expect(page.locator("#provenance")).toContainText("Tasks 1");
  await expect(page.locator("#provenance")).toContainText("Latest source record modified not available");

  const change = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Change" }).click();
  await (await change).setFiles(badPath);
  await expect(page.locator("#notice")).toContainText("previous workbook is still shown");
  await expect(page.locator("#title")).toHaveText("phase-two");
  await expect(page.locator("#provenance")).toContainText("Tasks 1");

  await page.getByRole("button", { name: "Forget" }).click();
  await expect(page.locator("#title")).toHaveText("Gantt Viewer");
  await expect(page.locator("#provenance")).toBeEmpty();
  await expect(page.locator("body")).toHaveAttribute("data-status", "empty");
  expect(requests.some((url) => url.includes("sharepoint") || (url.startsWith("http") && !url.startsWith(baseURL)))).toBe(false);
});

test("loads the sample workbook from reference/data-source.xlsx", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showOpenFilePicker", { configurable: true, value: undefined });
  });
  await page.goto(baseURL);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose workbook" }).click();
  await (await chooser).setFiles(path.resolve("reference/data-source.xlsx"));
  await expect(page.locator("#title")).toHaveText("data-source");
  await expect(page.locator("#provenance")).toContainText("Tasks 36");
  await expect(page.locator("#metricTasks")).toHaveText("22");
  await expect(page.locator(".task-row")).toHaveCount(36);
  await expect(page.locator(".bar")).toHaveCount(19);
  await expect(page.locator("#provenance")).toContainText("Latest source record modified 2026-10-25");
  await expect(page.locator("#issues")).toContainText("tblWBS");
  await expect(page.locator("#issues")).not.toContainText("not an allowed HTTPS SharePoint link");
  await expect(page.locator("#notice")).toBeEmpty();
  await expect(page.locator("body")).toHaveAttribute("data-status", "ready");
});
