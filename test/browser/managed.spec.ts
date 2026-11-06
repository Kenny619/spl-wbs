import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

let fileUrl = "";
let base64 = "";

test.beforeAll(async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("ProjectWBS");
  sheet.addRow(["ID", "Title", "WBSCode", "TaskType", "Progress", "TaskStatus",
    "AssignedTo", "Updates", "PlannedStart", "PlannedEnd"]);
  sheet.addRow([501, "Synthetic milestone", "1.2", "Task", 20, "In Progress",
    "Owner A", "Initial update", "2026-11-02", "2026-11-06"]);
  base64 = Buffer.from(await book.xlsx.writeBuffer()).toString("base64");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", "build:managed"], { shell: true, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error("Managed build failed: " + code)));
  });
  fileUrl = pathToFileURL(path.resolve("dist-managed/managed.html")).href;
}, { timeout: 120000 });

async function openManaged(page: import("@playwright/test").Page) {
  await page.addInitScript(({ encoded }) => {
    const decoded = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const files = new Map<string, Uint8Array>([["synthetic-demo.xlsx", decoded]]);
    const dir = {
      kind: "directory", name: "disposable-fixture",
      async getFileHandle(name: string, opts?: { create?: boolean }) {
        if (!files.has(name)) {
          if (!opts?.create) throw new DOMException("not found", "NotFoundError");
          files.set(name, new Uint8Array());
        }
        return {
          kind: "file", name,
          async getFile() {
            return new File([new Uint8Array(files.get(name)!)], name,
              { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          },
          async createWritable() {
            let next = new Uint8Array();
            return {
              async write(chunk: Uint8Array) { next = new Uint8Array(chunk); },
              async close() { files.set(name, next); },
            };
          },
        };
      },
      async *entries() {
        for (const name of files.keys()) yield [name, { kind: "file", name }];
      },
      async removeEntry(name: string) { files.delete(name); },
    };
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true, value: async () => dir,
    });
  }, { encoded: base64 });
  await page.goto(fileUrl);
  await expect(page.getByText("EXCEL MANAGED · DEVELOPMENT PREVIEW")).toBeVisible();
  await page.getByRole("button", { name: "Choose project folder" }).click();
  await expect(page.locator("#title")).toHaveText("synthetic-demo");
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.locator(".task-row").first().click();
  await expect(page.locator("#panel")).toHaveClass(/open/);
  await expect(page.getByRole("button", { name: "Edit task" })).toBeEnabled();
  await expect(page.locator(".source-record")).toBeHidden();
}

test("managed v18 detail editor protects unsaved changes on task-panel close", async ({ page }) => {
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Unsaved title");
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();

  await page.locator("#close").click();
  await expect(page.getByRole("dialog", { name: "Unsaved changes" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("#panel")).toHaveClass(/open/);
  await expect(page.getByLabel("Task title")).toHaveValue("Unsaved title");

  await page.locator("#close").click();
  await page.getByRole("dialog", { name: "Unsaved changes" }).getByRole("button", { name: "Discard" }).click();
  await expect(page.locator("#panel")).not.toHaveClass(/open/);
});

test("managed preview explicit Save updates task and history without changing read-only build", async ({ page }) => {
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Committed title");
  await page.getByLabel("Append update").fill("Checked by the delivery team");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Verified Save: task and UpdateHistory persisted/)).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".panel-title")).toContainText("Committed title");
  await expect(page.getByRole("button", { name: "Edit task" })).toBeVisible();
});
