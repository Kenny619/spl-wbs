import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { projectDataWorkbook } from "../fixtures/projectDataWorkbook";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

let fileUrl = "";
let base64 = "";
let packagedUatBase64 = "";

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
  // This is the REAL Excel file shipped to the owner, not the small synthetic
  // one-task workbook used by other managed tests.
  packagedUatBase64 = (await readFile(path.resolve(
    "dist-managed/SPT-WBS_DES010_Synthetic_UAT.xlsx",
  ))).toString("base64");
}, { timeout: 120000 });

async function openManaged(page: import("@playwright/test").Page, encoded = base64) {
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
    Object.defineProperty(window, "__managedFixtureFiles", { configurable: true, value: files });
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true, value: async () => dir,
    });
  }, { encoded });
  await page.goto(fileUrl);
  await expect(page.getByText("EXCEL MANAGED · DEVELOPMENT PREVIEW")).toBeVisible();
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Choose project folder" }).click();
  await expect(page.locator("#title")).toHaveText(encoded === base64 ? "synthetic-demo" : "Synthetic shared project");
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


test("Save As creates verified new active workbook, keeps original unchanged, and next Save backs up the copy", async ({ page }) => {
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") await dialog.accept("working-copy.xlsx");
    else await dialog.accept();
  });
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Copied milestone");
  await page.getByRole("button", { name: "Save As…" }).click();
  await expect(page.locator("#title")).toHaveText("working-copy");
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue("working-copy.xlsx");
  await expect(page.getByText(/Save As verified: working-copy.xlsx is now active/)).toBeVisible();
  const sourceAndCopy = await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    return { original: Array.from(files.get("synthetic-demo.xlsx")!),
      copy: Array.from(files.get("working-copy.xlsx")!) };
  });
  const originalBook = new ExcelJS.Workbook();
  await originalBook.xlsx.load(Uint8Array.from(sourceAndCopy.original) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(originalBook.getWorksheet("ProjectWBS")?.getCell("B2").value).toBe("Synthetic milestone");
  expect(originalBook.getWorksheet("UpdateHistory")).toBeUndefined();
  const copiedBook = new ExcelJS.Workbook();
  await copiedBook.xlsx.load(Uint8Array.from(sourceAndCopy.copy) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(copiedBook.getWorksheet("ProjectWBS")?.getCell("B2").value).toBe("Copied milestone");
  expect(copiedBook.getWorksheet("UpdateHistory")?.rowCount).toBe(2);

  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Second saved edit");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Verified Save: task and UpdateHistory persisted/)).toBeVisible();
  const names = await page.evaluate(() =>
    [...(window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles.keys()]);
  expect(names).toContain("working-copy.backup.xlsx");
  expect(names).not.toContain("synthetic-demo.backup.xlsx");
});

test("Save As after external source change preserves outside edits and uses loaded baseline, without false merge", async ({ page }) => {
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") await dialog.accept("conflict-copy.xlsx");
    else await dialog.accept();
  });
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("From original baseline");
  await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    files.set("synthetic-demo.xlsx", new TextEncoder().encode("EXTERNAL EXCEL MODIFICATION"));
  });
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Save NOT verified:.*changed since it was loaded/)).toBeVisible();
  await expect(page.getByLabel("Task title")).toHaveValue("From original baseline");

  await page.getByRole("button", { name: "Save As…" }).click();
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue("conflict-copy.xlsx");
  const files = await page.evaluate(() => {
    const map = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    return { original: new TextDecoder().decode(map.get("synthetic-demo.xlsx")),
      copy: Array.from(map.get("conflict-copy.xlsx")!) };
  });
  expect(files.original).toBe("EXTERNAL EXCEL MODIFICATION");
  const copy = new ExcelJS.Workbook();
  await copy.xlsx.load(Uint8Array.from(files.copy) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(copy.getWorksheet("ProjectWBS")?.getCell("B2").value).toBe("From original baseline");
});

test("Save As refuses an existing destination and retains the unsaved edit and active source", async ({ page }) => {
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") await dialog.accept("synthetic-demo.xlsx");
    else await dialog.accept();
  });
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Keep my draft");
  await page.getByRole("button", { name: "Save As…" }).click();
  await expect(page.getByText(/Save As NOT confirmed:/)).toBeVisible();
  await expect(page.getByLabel("Task title")).toHaveValue("Keep my draft");
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue("synthetic-demo.xlsx");
});


test("Change History is read-only, grouped and filtered, with task entry and safe untrusted text", async ({ page }) => {
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await openManaged(page);
  // Global toolbar is behind the task-detail overlay; close details first.
  await page.locator("#close").click();

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("dialog", { name: "Settings" })
    .getByRole("button", { name: "Change History" }).click();
  let history = page.getByRole("dialog", { name: "Change History" });
  await expect(history.getByText("This workbook has no saved Change History yet.")).toBeVisible();
  await history.getByRole("button", { name: "Close" }).click();
  await page.locator(".task-row").first().click();

  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("History target");
  await page.getByLabel("Append update").fill("<img src=x onerror=alert('x')>");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Verified Save: task and UpdateHistory persisted/)).toBeVisible();

  await page.getByRole("button", { name: "Task history" }).click();
  history = page.getByRole("dialog", { name: "Change History" });
  await expect(history.getByText("1 saved change event(s)")).toBeVisible();
  await expect(history.locator(".managed-history-row")).toHaveCount(2);
  await expect(history.locator(".managed-history-when small")).toHaveCount(2);
  await expect(history.locator(".managed-history-event")).toHaveCount(1);
  await expect(history.getByLabel("History task filter")).toHaveValue("501");
  expect(await history.locator("img").count()).toBe(0);
  await history.getByText("Expand full before / after").click();
  await expect(history.locator("pre")).toContainText("<img src=x onerror=alert('x')>");
  await history.getByLabel("History field filter").selectOption("Title");
  await expect(history.locator(".managed-history-row")).toHaveCount(1);
  await expect(history.locator(".managed-history-action > strong")).toHaveText("Title");
  await history.getByLabel("History end date").fill("2000-01-01");
  await expect(history.getByText("No changes match these filters.")).toBeVisible();
  await history.getByRole("button", { name: "Close" }).click();
});


test("Settings relocates existing v18 columns, persists timezone and dark theme locally", async ({ page }) => {
  await openManaged(page);
  await page.locator("#close").click();
  await expect(page.locator("#columnToggle")).toBeHidden();
  await expect(page.locator("#calendarSettings")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings).toBeVisible();
  await expect(settings.locator("#columnOptions input")).toHaveCount(9);
  await expect(settings.locator("#columnOptions input[data-column='wbs']")).toBeDisabled();
  await expect(settings.locator("#columnOptions input[data-column='task']")).toBeDisabled();
  await settings.locator("#columnOptions input[data-column='owner']").uncheck();
  await settings.locator("#columnOptions input[data-column='workstream']").check();
  await expect(page.locator("#gridHeader")).not.toContainText("Owner");
  await expect(page.locator("#gridHeader")).toContainText("Workstream");

  await settings.getByLabel("Display timezone").selectOption("Asia/Tokyo");
  await settings.getByRole("radio", { name: "Dark" }).check();
  await expect(page.locator("body")).toHaveAttribute("data-managed-theme", "dark");
  await expect(settings.getByLabel("Display timezone")).toHaveValue("Asia/Tokyo");
  await settings.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeFocused();

  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const restored = page.getByRole("dialog", { name: "Settings" });
  await expect(restored.getByLabel("Display timezone")).toHaveValue("Asia/Tokyo");
  await expect(restored.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(restored.locator("#columnOptions input[data-column='owner']")).not.toBeChecked();
  await expect(restored.locator("#columnOptions input[data-column='workstream']")).toBeChecked();
  await expect(page.locator("body")).toHaveAttribute("data-managed-theme", "dark");
});

test("Settings System appearance follows device and Reset requires confirmation; workbook remains unchanged", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openManaged(page);
  await page.locator("#close").click();
  const original = await page.evaluate(() =>
    Array.from((window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings.getByRole("radio", { name: /System/ })).toBeChecked();
  await expect(page.locator("body")).toHaveAttribute("data-managed-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveAttribute("data-managed-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveAttribute("data-managed-theme", "light");
  await settings.getByRole("radio", { name: "Dark" }).check();
  await expect(page.locator("body")).toHaveAttribute("data-managed-theme", "dark");

  await settings.getByLabel("Display timezone").selectOption("UTC");
  await settings.locator("#columnOptions input[data-column='status']").uncheck();

  page.once("dialog", (dialog) => void dialog.dismiss());
  await settings.getByRole("button", { name: "Reset to defaults" }).click();
  await expect(settings.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(settings.locator("#columnOptions input[data-column='status']")).not.toBeChecked();

  page.once("dialog", (dialog) => void dialog.accept());
  await settings.getByRole("button", { name: "Reset to defaults" }).click();
  await expect(settings.getByRole("radio", { name: /System/ })).toBeChecked();
  await expect(page.locator("body")).toHaveAttribute("data-managed-theme", "light");
  await expect(settings.locator("#columnOptions input[data-column='status']")).toBeChecked();
  const detected = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  await expect(settings.getByLabel("Display timezone")).toHaveValue(detected);
  await expect(page.locator("#calendarSettings")).toBeVisible();
  const after = await page.evaluate(() =>
    Array.from((window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  expect(after).toEqual(original);
});

test("Change History uses the Settings timezone without mutating saved UTC audit values", async ({ page }) => {
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Committed with timezone");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Verified Save: task and UpdateHistory persisted/)).toBeVisible();
  await page.locator("#close").click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByLabel("Display timezone").selectOption("Asia/Tokyo");
  await settings.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("dialog", { name: "Settings" })
    .getByRole("button", { name: "Change History" }).click();
  const history = page.getByRole("dialog", { name: "Change History" });
  await expect(history.getByText(/Times are displayed in Asia\/Tokyo/)).toBeVisible();
  await expect(history.getByText(/1 saved change event/)).toBeVisible();
});


test("Report 1.1 keeps committed-only snapshot after mode changes, and copies exact text", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { __copiedReport: string }).__copiedReport = text;
        },
      },
    });
  });
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Not yet committed");
  await page.getByRole("button", { name: "Output Reports" }).last().click();
  const report = page.getByRole("dialog", { name: "Output Reports" });
  await expect(report).toBeVisible();
  await expect(report.getByText(/Unsaved task edits exist/)).toBeVisible();
  await report.getByLabel("Project name").fill("Synthetic Program");
  await report.getByLabel("Report mode").selectOption("status");
  await report.getByLabel("Report format").selectOption("text");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  const preview = report.getByRole("textbox", { name: "Report preview" });
  await expect(preview).toHaveValue(/LATEST STATUS/);
  await expect(preview).toHaveValue(/Project: Synthetic Program/);
  await expect(preview).toHaveValue(/DAYS TO GO-LIVE:/);
  expect(await preview.inputValue()).not.toContain("Not yet committed");
  expect(await preview.inputValue()).not.toContain("Workbook:");
  const snapshot = await preview.inputValue();
  await report.getByLabel("Report mode").selectOption("progress");
  await expect(preview).toHaveValue(snapshot);
  await report.getByRole("button", { name: "Copy Report" }).click();
  await expect(report.getByText(/Exact plain-text preview copied/)).toBeVisible();
  const copied = await page.evaluate(() =>
    (window as unknown as { __copiedReport: string }).__copiedReport);
  expect(copied).toBe(snapshot);
  await page.locator(".managed-main-nav [data-managed-view='schedule']").click();
  await expect(report).toBeHidden();
  await expect(page.getByLabel("Task title")).toHaveValue("Not yet committed");
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
});

test("Report 1.1 Detailed Audit preserves history, timezone and workbook bytes", async ({ page }) => {
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Saved for reporting");
  await page.getByLabel("Append update").fill("Confirmed progress review");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Verified Save: task and UpdateHistory persisted/)).toBeVisible();

  const beforeReport = await page.evaluate(() =>
    Array.from((window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  await page.locator("#close").click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByLabel("Display timezone").selectOption("Asia/Tokyo");
  await settings.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Output Reports" }).click();
  const report = page.getByRole("dialog", { name: "Output Reports" });
  await report.getByLabel("Project name").fill("Synthetic Program");
  await report.getByLabel("Report mode").selectOption("audit");
  await report.getByLabel("Report format").selectOption("text");
  await report.getByLabel("Report start date").fill("2026-01-01");
  await report.getByLabel("Report end date").fill("2027-12-31");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  const preview = report.getByRole("textbox", { name: "Report preview" });
  await expect(preview).toHaveValue(/Detailed Change Audit/);
  await expect(preview).toHaveValue(/Save events: 1/);
  await expect(preview).toHaveValue(/Field changes: 2/);
  await expect(preview).toHaveValue(/Save ID/);
  await expect(preview).toHaveValue(/Confirmed progress review/);
  await expect(preview).toHaveValue(/Asia\/Tokyo/);
  const text = await preview.inputValue();
  await report.getByLabel("Report end date").fill("1900-01-01");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  await expect(report.getByText(/Report not generated: Choose valid start\/end dates/)).toBeVisible();
  await expect(preview).toHaveValue(text);
  const afterReport = await page.evaluate(() =>
    Array.from((window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  expect(afterReport).toEqual(beforeReport);
});

test("Report 1.1 denied clipboard shows accurate failure and retains the snapshot", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => { throw new DOMException("Denied", "NotAllowedError"); },
      },
    });
  });
  await openManaged(page);
  await page.locator("#close").click();
  await page.getByRole("button", { name: "Output Reports" }).click();
  const report = page.getByRole("dialog", { name: "Output Reports" });
  await report.getByLabel("Project name").fill("Synthetic Program");
  await report.getByLabel("Report mode").selectOption("status");
  await report.getByLabel("Report format").selectOption("text");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  const preview = report.getByRole("textbox", { name: "Report preview" });
  const original = await preview.inputValue();
  await report.getByRole("button", { name: "Copy Report" }).click();
  await expect(report.getByText(/Copy failed: Denied/)).toBeVisible();
  await expect(preview).toHaveValue(original);
});

test("Report 1.1 HTML preview and Outlook dual MIME copy keep an immutable snapshot", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: class FakeClipboardItem {
        data: Record<string, Blob>;
        constructor(data: Record<string, Blob>) { this.data = data; }
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: async (items: Array<{ data: Record<string, Blob> }>) => {
          const mime = items[0].data;
          (window as unknown as { __copiedHtml: string; __copiedPlain: string }).__copiedHtml =
            await mime["text/html"].text();
          (window as unknown as { __copiedPlain: string }).__copiedPlain =
            await mime["text/plain"].text();
        },
      },
    });
  });
  await openManaged(page);
  await page.locator("#close").click();
  await page.getByRole("button", { name: "Output Reports" }).click();
  const report = page.getByRole("dialog", { name: "Output Reports" });
  await expect(report.getByLabel("Report task limit")).toHaveValue("all");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  await expect(report.getByText(/Enter a Project name before generating/)).toBeVisible();
  await report.getByLabel("Project name").fill("Project Orion & Launch");
  await report.getByLabel("Report mode").selectOption("status");
  await report.getByLabel("Report format").selectOption("html");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  const iframe = report.locator("iframe[title='Formatted report preview']");
  const srcdoc = await iframe.getAttribute("srcdoc");
  expect(srcdoc).toContain("Project Orion &amp; Launch");
  expect(srcdoc).not.toContain("Workbook:");
  expect(srcdoc).not.toContain("<script");
  await report.getByLabel("Report format").selectOption("text");
  const plain = await report.getByRole("textbox", { name: "Report preview" }).inputValue();
  expect(plain).toContain("Project: Project Orion & Launch");
  await report.getByLabel("Report format").selectOption("html");
  expect(await iframe.getAttribute("srcdoc")).toBe(srcdoc);
  await report.getByRole("button", { name: "Copy for Outlook" }).click();
  await expect(report.getByText(/HTML and matching plain text copied/)).toBeVisible();
  const clipboard = await page.evaluate(() => {
    const holder = window as unknown as { __copiedHtml: string; __copiedPlain: string };
    return { html: holder.__copiedHtml, plain: holder.__copiedPlain };
  });
  expect(clipboard.html).toBe(srcdoc);
  expect(clipboard.plain).toBe(plain);
});

test("DES-012 Reports visual parity: one baseline across Schedule, Report Studio and dark theme", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openManaged(page);

  const chart = page.locator(".managed-schedule-body .chart-card");
  const detail = page.locator(".managed-schedule-body .detail-panel");
  await expect(chart).toBeVisible();
  await expect(detail).toBeVisible();
  const priority = page.locator(".managed-schedule-summary");
  await expect(priority).toBeVisible();
  await expect(priority).toContainText("Blocked");
  await expect(priority).toContainText("At Risk");
  await expect(priority).toContainText("Open milestones");
  const scheduleRadius = await chart.evaluate((node) => getComputedStyle(node).borderRadius);
  expect(scheduleRadius).toBe("12px");
  const scheduleToolbar = page.locator(".managed-schedule-body .managed-gantt-scope");
  await expect(scheduleToolbar).toBeVisible();
  await testInfo.attach("des012-schedule-light", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });

  await page.getByRole("button", { name: "Output Reports" }).last().click();
  const reports = page.getByRole("dialog", { name: "Output Reports" });
  await expect(priority).toBeHidden();
  const sidebar = reports.locator(".report11-builder");
  const workspace = reports.locator(".report11-workspace");
  await expect(sidebar).toBeVisible();
  await expect(workspace).toBeVisible();
  await expect(sidebar.getByRole("heading", { name: "Build a report" })).toBeVisible();
  await expect(reports).toHaveClass(/report11-des012/);
  await expect(sidebar).toContainText("Choose the perspective, set your scope and preview a stakeholder-ready document.");
  await expect(sidebar).toContainText("Executive snapshot, key exceptions and upcoming commitments.");
  await expect(workspace.getByRole("heading", { name: "Document preview" })).toBeVisible();
  await expect(workspace.locator(".report11-panel-subtitle")).toContainText("STATIC SNAPSHOT");
  await expect(reports.locator(".report11-preview-top")).toBeHidden();
  await expect(reports.locator(".report11-settings-section")).toContainText("Reporting period");
  await expect(reports.locator(".report11-mode-card")).toHaveCount(3);
  await expect(reports.locator(".report11-native-mode select")).toHaveAttribute("tabindex", "-1");
  await expect(reports.locator(".report11-mode-card")).toHaveCount(3);
  await expect(reports.locator(".report11-mode-card.active")).toContainText("Latest Status");
  await expect(reports.locator(".report11-format-choices")).toBeVisible();

  const left = await sidebar.boundingBox();
  const right = await workspace.boundingBox();
  expect(left && right).toBeTruthy();
  expect(left!.x + left!.width).toBeLessThan(right!.x);
  expect(left!.width).toBeGreaterThanOrEqual(300);
  expect(left!.width).toBeLessThanOrEqual(304);
  expect(right!.width).toBeGreaterThan(520);

  await reports.getByLabel("Project name").fill("Design Parity Program");
  await reports.getByLabel("Report mode").selectOption("status");
  await reports.getByRole("button", { name: "Generate / Refresh" }).click();
  const srcdoc = await reports.locator('iframe[title="Formatted report preview"]').getAttribute("srcdoc");
  expect(srcdoc).toContain('class="report-paper"');
  expect(srcdoc).toContain('class="metric go-live"');
  expect(srcdoc).toContain('class="metric red"');
  expect(srcdoc).toContain('class="metric amber"');
  expect(srcdoc).toContain("Executive snapshot");
  expect(srcdoc).not.toContain("Overall progress");
  expect(srcdoc).toContain("Design Parity Program");
  await expect(workspace.locator(".report11-format-choice.active")).toContainText("HTML preview");
  await expect(workspace.getByRole("button", { name: "Download HTML" })).toBeVisible();
  const paperStyle = await reports.locator(".report11-paper-stage").evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(paperStyle).toBe("rgb(233, 239, 243)");
  await testInfo.attach("des012-reports-light", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });

  await page.evaluate(() => { document.body.dataset.managedTheme = "dark"; });
  const background = await sidebar.evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(background).toBe("rgb(28, 41, 59)");
  const darkPaper = await reports.locator(".report11-paper-stage").evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(darkPaper).toBe("rgb(16, 32, 45)");
  await testInfo.attach("des012-reports-dark", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
  await reports.locator("[data-report11-mode='audit']").click();
  await expect(reports.getByLabel("Report mode")).toHaveValue("audit");
  await expect(workspace.getByRole("heading", { name: "Document preview" })).toBeVisible();
  // An ungenerated mode change must not rewrite the prior committed snapshot.
  expect(await reports.locator('iframe[title="Formatted report preview"]').getAttribute("srcdoc")).toBe(srcdoc);
  await page.locator(".managed-main-nav [data-managed-view='schedule']").click();
  await expect(chart).toBeVisible();
  await expect(reports).toBeHidden();
});

test("DES-012 Reports compact layout stays functional at 1024 and 720 without losing mode controls", async ({ page }, testInfo) => {
  await openManaged(page);
  await page.getByRole("button", { name: "Output Reports" }).last().click();
  const reports = page.getByRole("dialog", { name: "Output Reports" });
  const builder = reports.locator(".report11-builder");
  const documentStage = reports.locator(".report11-workspace");

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(builder).toBeVisible();
  await expect(documentStage).toBeVisible();
  const left = await builder.boundingBox();
  const right = await documentStage.boundingBox();
  expect(left && right).toBeTruthy();
  expect(left!.x + left!.width).toBeLessThan(right!.x);
  expect(left!.width).toBeGreaterThanOrEqual(258);
  await testInfo.attach("des012-report-1024", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });

  await page.setViewportSize({ width: 720, height: 900 });
  const compactBuilder = await builder.boundingBox();
  const compactWorkspace = await documentStage.boundingBox();
  expect(compactBuilder && compactWorkspace).toBeTruthy();
  expect(compactWorkspace!.y).toBeGreaterThan(compactBuilder!.y + compactBuilder!.height - 2);
  await expect(reports.locator(".report11-mode-card")).toHaveCount(3);
  await expect(documentStage.getByRole("heading", { name: "Document preview" })).toBeVisible();
  // In compact mode the report builder and preview form a single scrollable
  // workspace inside the fixed 100dvh managed app. An off-viewport Generate
  // button must remain reachable by the same scrolling a real user performs.
  const scroll = await reports.evaluate((node) => ({
    overflow: getComputedStyle(node).overflowY,
    extra: node.scrollHeight - node.clientHeight,
  }));
  expect(scroll.overflow).toBe("auto");
  expect(scroll.extra).toBeGreaterThan(40);
  await reports.getByLabel("Project name").fill("Responsive Reporting Program");
  await reports.locator("[data-report11-mode='status']").click();
  const generate = reports.locator(".report11-generate");
  await generate.scrollIntoViewIfNeeded();
  await expect(generate).toBeVisible();
  await generate.click();
  const html = await reports.locator('iframe[title="Formatted report preview"]').getAttribute("srcdoc");
  expect(html).toContain("Responsive Reporting Program");
  await reports.locator("[data-report11-format='text']").click();
  await expect(reports.getByRole("textbox", { name: "Report preview" })).toHaveValue(/Responsive Reporting Program/);
  await expect(documentStage.getByRole("button", { name: "Download text" })).toBeVisible();
  await testInfo.attach("des012-report-720", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
});

test("Stage A inspector shows READY state without modifying any workbook bytes", async ({ page }) => {
  await openManaged(page);
  const source = await page.evaluate(() =>
    Array.from((window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  await page.locator("#close").click();
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Inspect Save State" }).click();
  const dialog = page.getByRole("dialog", { name: "Inspect Save State" });
  await expect(dialog.getByText("Inspection: READY")).toBeVisible();
  await expect(dialog.getByText(/does not prove that the workbook is unchanged/)).toBeVisible();
  await expect(dialog.getByText(/synthetic-demo.xlsx/).first()).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  const after = await page.evaluate(() =>
    Array.from((window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  expect(after).toEqual(source);
});

test("Stage A orphan recovery file blocks direct Save and inspector preserves all evidence", async ({ page }) => {
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await openManaged(page);
  const source = await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    files.set("synthetic-demo.stage.xlsx", new TextEncoder().encode("unowned recovery evidence"));
    return Array.from(files.get("synthetic-demo.xlsx")!);
  });
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Do not overwrite");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Save blocked — inspect recovery files/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save to workbook" })).toBeDisabled();
  await expect(page.getByLabel("Task title")).toHaveValue("Do not overwrite");

  await page.locator("#close").click();
  await page.getByRole("dialog", { name: "Unsaved changes" })
    .getByRole("button", { name: "Discard" }).click();
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Inspect Save State" }).click();
  const dialog = page.getByRole("dialog", { name: "Inspect Save State" });
  await expect(dialog.getByText("Inspection: STOP")).toBeVisible();
  await expect(dialog.getByText(/Unrecognized orphan staging file/)).toBeVisible();
  await expect(dialog.getByText(/Do not save, overwrite, delete or rename/)).toBeVisible();
  const names = await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    return {
      source: Array.from(files.get("synthetic-demo.xlsx")!),
      stage: new TextDecoder().decode(files.get("synthetic-demo.stage.xlsx")!),
    };
  });
  expect(names.source).toEqual(source);
  expect(names.stage).toBe("unowned recovery evidence");
});


test("Save As to selected other folder switches active directory only after verified copy, then backs up there", async ({ page }) => {
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") await dialog.accept("other-folder-copy.xlsx");
    else await dialog.accept();
  });
  await openManaged(page);
  const original = await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    return Array.from(files.get("synthetic-demo.xlsx")!);
  });
  await page.evaluate(() => {
    const files = new Map<string, Uint8Array>();
    const directory = {
      kind: "directory", name: "other-disposable-folder",
      async getFileHandle(name: string, opts?: { create?: boolean }) {
        if (!files.has(name)) {
          if (!opts?.create) throw new DOMException("not found", "NotFoundError");
          files.set(name, new Uint8Array());
        }
        return {
          kind: "file", name,
          async getFile() {
            return new File([new Uint8Array(files.get(name)!)], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          },
          async createWritable() {
            let contents = new Uint8Array();
            return {
              async write(chunk: Uint8Array) { contents = new Uint8Array(chunk); },
              async close() { files.set(name, contents); },
            };
          },
        };
      },
      async *entries() { for (const name of files.keys()) yield [name, { kind: "file", name }]; },
      async removeEntry(name: string) { files.delete(name); },
    };
    Object.defineProperty(window, "__managedOtherFiles", { configurable: true, value: files });
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true, value: async () => directory,
    });
  });
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Saved to second folder");
  await page.getByRole("button", { name: "Save As to folder…" }).click();
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue("other-folder-copy.xlsx");
  await expect(page.getByText(/Save As verified: other-folder-copy.xlsx is now active in other-disposable-folder/)).toBeVisible();
  const bytes = await page.evaluate(() => {
    const originalFiles = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    const otherFiles = (window as unknown as { __managedOtherFiles: Map<string, Uint8Array> }).__managedOtherFiles;
    return {
      oldBytes: Array.from(originalFiles.get("synthetic-demo.xlsx")!),
      originalNames: [...originalFiles.keys()],
      copy: Array.from(otherFiles.get("other-folder-copy.xlsx")!),
      otherNames: [...otherFiles.keys()],
    };
  });
  expect(bytes.oldBytes).toEqual(original);
  expect(bytes.originalNames).toEqual(["synthetic-demo.xlsx"]);
  expect(bytes.otherNames).toEqual(["other-folder-copy.xlsx"]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(bytes.copy) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(workbook.getWorksheet("ProjectWBS")?.getCell("B2").value).toBe("Saved to second folder");

  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Second folder edited directly");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Verified Save: task and UpdateHistory persisted/)).toBeVisible();
  const after = await page.evaluate(() => ({
    originalNames: [...(window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles.keys()],
    otherNames: [...(window as unknown as { __managedOtherFiles: Map<string, Uint8Array> }).__managedOtherFiles.keys()],
  }));
  expect(after.originalNames).toEqual(["synthetic-demo.xlsx"]);
  expect(after.otherNames).toContain("other-folder-copy.backup.xlsx");
});

test("Save As other folder denied leaves original project and unsaved draft intact", async ({ page }) => {
  await openManaged(page);
  await page.evaluate(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true, value: async () => { throw new DOMException("Denied", "NotAllowedError"); },
    });
  });
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Uncommitted on denied destination");
  await page.getByRole("button", { name: "Save As to folder…" }).click();
  await expect(page.getByText(/Save As destination folder not selected: Denied/)).toBeVisible();
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue("synthetic-demo.xlsx");
  await expect(page.getByLabel("Task title")).toHaveValue("Uncommitted on denied destination");
});


test("Failed workbook selection keeps previous verified source, editable state and fingerprint", async ({ page }) => {
  await openManaged(page);
  await page.locator("#close").click();
  await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    files.set("unreadable.xlsx", new TextEncoder().encode("corrupt ZIP bytes"));
  });
  // After a folder has been loaded, the toolbar control is named Change folder.
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Change folder" }).click();
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue("synthetic-demo.xlsx");
  await page.locator(".managed-project-menu summary").click();
  await page.getByLabel("Active Excel workbook").selectOption("unreadable.xlsx");
  await expect(page.getByText(/Managed workbook unavailable:.*Previous verified workbook remains active/)).toBeVisible();
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue("synthetic-demo.xlsx");
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.locator(".task-row").first().click();
  await expect(page.getByRole("button", { name: "Edit task" })).toBeEnabled();
});

test("Failed new-folder import does not half-switch active directory or lose last-good edits", async ({ page }) => {
  await openManaged(page);
  await page.locator("#close").click();
  await page.evaluate(() => {
    const invalidDir = {
      kind: "directory", name: "unreadable-folder",
      async *entries() { yield ["unreadable.xlsx", { kind: "file", name: "unreadable.xlsx" }]; },
      async getFileHandle(name: string) {
        if (name !== "unreadable.xlsx") throw new DOMException("Missing file", "NotFoundError");
        return {
          name,
          async getFile() {
            return new File([new TextEncoder().encode("not an XLSX")], name);
          },
        };
      },
    };
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true, value: async () => invalidDir,
    });
  });
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Change folder" }).click();
  await expect(page.getByText(/Previous verified workbook remains active/)).toBeVisible();
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue("synthetic-demo.xlsx");
  await page.locator(".task-row").first().click();
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Still editing last-good workbook");
  await expect(page.getByLabel("Task title")).toHaveValue("Still editing last-good workbook");
});


test("DES-012 Stage A live Schedule preserves Gantt actions and scroll-contained Task Detail", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openManaged(page);
  await expect(page.locator("body")).toHaveClass(/spt-managed-des012-live/);
  const chart = page.locator(".managed-schedule-body .chart-card");
  const inspector = page.locator(".managed-schedule-body #panel");
  const head = inspector.locator(".managed-inspector-head");
  const scroll = inspector.locator(".managed-inspector-scroll");
  await expect(head.locator(".panel-title")).toHaveText("Synthetic milestone");
  await expect(head).toContainText("WBS 1.2");
  await expect(scroll.locator(".dt-rail[data-progress-recorded='true']")).toBeVisible();
  await expect(scroll.locator(".detail-grid")).toContainText("Owner A");
  const header = await head.boundingBox();
  const detailBox = await scroll.boundingBox();
  expect(header && detailBox).toBeTruthy();
  expect(detailBox!.y).toBeGreaterThan(header!.y + header!.height - 2);
  expect(await scroll.evaluate(x => getComputedStyle(x).overflowY)).toBe("auto");
  expect(await chart.evaluate(x => getComputedStyle(x).borderRadius)).toBe("12px");
  const ganttTop = chart.locator(".chart-top");
  const timelineControls = ganttTop.locator(".managed-review08-time-controls");
  const taskControls = ganttTop.locator(".managed-review08-task-controls");
  await expect(timelineControls.locator(".zoom-choice")).toHaveCount(4);
  await expect(timelineControls.locator("#today")).toBeVisible();
  await expect(timelineControls.locator("#fitTop")).toBeVisible();
  await expect(taskControls.locator("#search")).toBeVisible();
  await expect(taskControls.locator("#filterToggle")).toBeVisible();
  await expect(ganttTop.locator(".managed-gantt-scope")).toBeVisible();
  await expect(ganttTop.locator("#search")).toBeVisible();
  await expect(ganttTop.locator("#filterToggle")).toBeVisible();
  await expect(ganttTop.locator("#deps")).toBeAttached();
  await ganttTop.locator(".zoom-choice[data-zoom='month']").click();
  await expect(ganttTop.locator(".zoom-choice[data-zoom='month']")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Review08 live editor");
  await expect(scroll.getByLabel("Task title")).toHaveValue("Review08 live editor");
  await testInfo.attach("des012-stage-a-live-schedule", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
  await page.locator("#close").click();
  await page.getByRole("dialog", { name: "Unsaved changes" }).getByRole("button", { name: "Discard" }).click();
  await expect(inspector.locator(".managed-empty-detail")).toBeVisible();
});

test("DES-012 Option A uses recorded progress but does not fabricate 0% for an absent value", async ({ page }) => {
  page.on("dialog", async (dialog) => { await dialog.accept(); });
  await openManaged(page);
  const rail = page.locator(".managed-inspector-scroll .dt-rail");
  const card = page.locator(".managed-inspector-scroll .dt-rail-card");
  await expect(rail).toHaveAttribute("data-progress-recorded", "true");
  await expect(card.locator(".dt-rail-fill")).toHaveCount(1);
  await expect(card.locator(".dt-progressline")).toContainText("20%");
  const withProgress = await card.boundingBox();
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Progress (%)").fill("");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.locator(".managed-banner")).toContainText("Verified Save:", { timeout: 15000 });
  await expect(rail).toHaveAttribute("data-progress-recorded", "false");
  await expect(card.locator(".dt-rail-fill")).toHaveCount(0);
  await expect(card.locator(".dt-progressline")).not.toContainText("0%");
  const withoutProgress = await card.boundingBox();
  expect(withProgress && withoutProgress).toBeTruthy();
  expect(Math.abs(withoutProgress!.height - withProgress!.height)).toBeLessThanOrEqual(2);
});

test("DES-012 Task Detail renders a real milestone diamond without a fictional progress bar", async ({ page }) => {
  await page.goto(fileUrl);
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "SPT-WBS_DES010_Synthetic_UAT.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(packagedUatBase64, "base64"),
  });
  await expect(page.locator(".task-row")).toHaveCount(23);
  await page.locator(".task-row").filter({ hasText: "Readiness decision" }).click();
  await expect(page.locator(".managed-inspector-head .panel-title")).toContainText("Readiness decision");
  await expect(page.locator(".dt-rail-card")).toHaveAttribute("data-schedule", "milestone");
  await expect(page.locator(".dt-diamond")).toBeVisible();
  await expect(page.locator(".dt-rail")).toHaveCount(0);
});

test("DES-012 relationships use workbook Task IDs with guarded drill-down and Back", async ({ page }) => {
  await page.goto(fileUrl);
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "SPT-WBS_DES010_Synthetic_UAT.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(packagedUatBase64, "base64"),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
  await expect(page.locator(".task-row")).toHaveCount(23);
  await page.locator(".task-row").filter({ hasText: "Prototype schedule workspace" }).click();
  await expect(page.locator(".dt-relation-group")).toHaveCount(3);
  await expect(page.locator(".dt-relation-group").nth(1)).toContainText("Define navigation architecture");
  await expect(page.locator(".dt-relation-group").nth(2)).toContainText("Accessibility and keyboard review");
  await page.locator(".dt-related-task[data-related-task='201']").click();
  await expect(page.locator(".managed-inspector-head .panel-title")).toHaveText("Define navigation architecture");
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.locator(".managed-inspector-head .panel-title")).toHaveText("Prototype schedule workspace");
  await expect(page.getByRole("button", { name: "← Back" })).toHaveCount(0);
});

test("DES-012 Stage A shell is identical for read-only XLSX and writable directory imports", async ({ page }) => {
  await openManaged(page);
  const before = await page.locator(".managed-schedule-body").evaluate(x => ({
    classes: x.className,
    chart: Boolean(x.querySelector(".chart-card")),
    inspector: Boolean(x.querySelector(".managed-inspector-head")),
  }));
  await page.locator(".managed-project-menu summary").click();
  const input = page.getByLabel("Choose an XLSX for read-only preview");
  await input.setInputFiles({
    name: "SPT-WBS_DES010_Synthetic_UAT.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(packagedUatBase64, "base64"),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
  const after = await page.locator(".managed-schedule-body").evaluate(x => ({
    classes: x.className,
    chart: Boolean(x.querySelector(".chart-card")),
    inspector: Boolean(x.querySelector(".managed-inspector-head")),
  }));
  expect(after).toEqual(before);
  await expect(page.locator("body")).toHaveClass(/spt-managed-des012-live/);
  await expect(page.locator(".task-row")).toHaveCount(23);
  await page.locator(".task-row").first().click();
  await expect(page.locator(".managed-inspector-head .panel-title")).not.toBeEmpty();
  await expect(page.getByRole("button", { name: "Edit task" })).toBeDisabled();
  await page.locator(".managed-main-nav [data-managed-view='reports']").click();
  await expect(page.locator(".report11-builder")).toBeVisible();
  await page.locator(".managed-main-nav [data-managed-view='schedule']").click();
  await expect(page.locator(".managed-inspector-head")).toBeVisible();
});

test("DES-010 real managed shell anchors inspector, navigation and local Gantt controls", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openManaged(page);
  await expect(page.locator(".managed-brand img")).toBeVisible();
  await expect(page.locator(".managed-main-nav")).toContainText("Schedule");
  await expect(page.locator(".managed-main-nav")).toContainText("Reports");
  await expect(page.locator(".managed-gantt-scope [data-managed-scope='workstreams']")).toHaveAttribute("aria-pressed", "true");
  const chart = await page.locator(".managed-schedule-body .chart-card").boundingBox();
  const detail = await page.locator(".managed-schedule-body #panel").boundingBox();
  expect(chart).not.toBeNull();
  expect(detail).not.toBeNull();
  expect(detail!.x).toBeGreaterThan(chart!.x + chart!.width - 2);
  expect(Math.abs(detail!.height - chart!.height)).toBeLessThanOrEqual(4);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.locator(".managed-gantt-scope [data-managed-scope='exceptions']").click();
  await expect(page.locator(".managed-gantt-scope [data-managed-scope='exceptions']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".task-row")).toHaveCount(0); // The synthetic task is In Progress, not At Risk/Blocked.
  await page.locator(".managed-gantt-scope [data-managed-scope='workstreams']").click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await testInfo.attach("managed-DES010-schedule-1366", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
});

test("DES-010 real Settings and persisted History occupy one right drawer slot", async ({ page }, testInfo) => {
  page.on("dialog", async d => { await d.accept(); });
  await page.setViewportSize({ width: 1024, height: 768 });
  await openManaged(page);
  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("History drawer fixture");
  await page.getByRole("button", { name: "Save to workbook" }).click();
  await expect(page.getByText(/Verified Save: task and UpdateHistory persisted/)).toBeVisible();

  const settingsLaunch = page.getByRole("button", { name: "Settings", exact: true });
  await settingsLaunch.click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings.getByRole("button", { name: "Change History" })).toBeVisible();
  const settingsRect = await settings.boundingBox();
  expect(settingsRect!.x + settingsRect!.width).toBeCloseTo(1024, 0);
  await settings.getByRole("button", { name: "Change History" }).click();
  const history = page.getByRole("dialog", { name: "Change History" });
  await expect(history.locator(".managed-history-row")).toHaveCount(1);
  await expect(history.locator(".managed-history-row")).toContainText("History drawer fixture");
  await expect(history.locator(".managed-history-when small")).toContainText("Save");
  const historyRect = await history.boundingBox();
  expect(historyRect!.x).toBeCloseTo(settingsRect!.x, 0);
  await testInfo.attach("managed-DES010-history-1024", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
  await history.getByRole("button", { name: "Preferences" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
});

test("DES-010 real Reports uses fixed navigation and committed-only scroll workspace", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openManaged(page);
  const nav = page.locator(".managed-main-nav");
  const before = await nav.boundingBox();
  await nav.locator("[data-managed-view='reports']").click();
  await expect(page.locator("body")).toHaveClass(/spt-managed-report-open/);
  const report = page.getByRole("dialog", { name: "Output Reports" });
  await expect(report).toBeVisible();
  await expect(page.locator(".managed-schedule-body")).toBeHidden();
  await report.getByLabel("Project name").fill("Synthetic Program");
  await report.getByLabel("Report mode").selectOption("status");
  await report.getByLabel("Report format").selectOption("text");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  const preview = report.getByRole("textbox", { name: "Report preview" });
  await expect(preview).toHaveValue(/DAYS TO GO-LIVE:/);
  const after = await nav.boundingBox();
  expect(Math.abs(before!.x - after!.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(before!.y - after!.y)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await testInfo.attach("managed-DES010-reports-1366", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
  await nav.locator("[data-managed-view='schedule']").click();
  await expect(page.locator("body")).not.toHaveClass(/spt-managed-report-open/);
  await expect(page.locator(".managed-schedule-body")).toBeVisible();
});



test("UAT-02: managed dark theme has restrained day markers, semantic statuses and visible dependencies", async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-11-09T03:00:00Z"));
  await page.goto(fileUrl);
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "SPT-WBS_DES010_Synthetic_UAT.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(packagedUatBase64, "base64"),
  });
  await expect(page.locator(".task-row")).toHaveCount(23);
  // Loading task rows precedes the asynchronous ProjectData/Watch projection.
  // Wait for the *completed* read-only import banner before opening Settings:
  // its final render must not replace a drawer mid-interaction.
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings).toBeVisible();
  await settings.getByRole("radio", { name: "Dark" }).check();
  await settings.getByRole("button", { name: "Close" }).click();
  await page.locator(".zoom-choice").filter({ hasText: "Day" }).click();
  await page.locator(".task-row").filter({ hasText: "Requirements sign-off" }).click();
  await expect(page.locator(".dt-remaining")).toBeVisible();
  await expect(page.locator(".dt-remaining")).toContainText("4 days remaining");
  await expect(page.locator(".dt-remaining")).not.toContainText(/workdays?/i);
  await expect(page.locator(".calendar-hint")).not.toContainText(/workdays?/i);
  await page.locator("#deps").check();
  await expect(page.locator(".dep-layer path").first()).toBeAttached();
  const styles = await page.evaluate(() => {
    const css = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    const statuses = [...document.querySelectorAll(".task-row .pill")].map(node => {
      const style = getComputedStyle(node);
      return { label: node.textContent?.trim(), color: style.color, background: style.backgroundColor };
    });
    return {
      weekend: css(".holiday-overlay").backgroundColor,
      remaining: css(".dt-rail-card").backgroundColor,
      remainingText: css(".dt-remaining").color,
      separator: css(".zoom-choice").borderRightColor,
      dependency: css(".dep-layer path").stroke,
      statuses,
    };
  });
  expect(styles.weekend).toBe("rgb(43, 65, 89)"); // overrides inline #eef3f8
  const shadeOpacity = await page.locator(".holiday-overlay").first().evaluate(node => getComputedStyle(node).opacity);
  expect(shadeOpacity).toBe("0.58");
  expect(styles.remaining).not.toBe("rgb(248, 251, 255)");
  expect(styles.dependency).toBe("rgb(180, 216, 250)");
  expect(new Set(styles.statuses.map(item => item.background)).size).toBeGreaterThan(2);
  await testInfo.attach("managed-UAT02-dark-contrast", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
});

test("UAT-02: Reports uses global Schedule navigation and no redundant Close button", async ({ page }) => {
  await openManaged(page);
  await page.locator(".managed-main-nav [data-managed-view='reports']").click();
  const report = page.getByRole("dialog", { name: "Output Reports" });
  await expect(report).toBeVisible();
  await expect(report.getByRole("button", { name: "Close", exact: true })).toHaveCount(0);
  await expect(report.locator(".report11-mode-card.active")).toBeFocused();
  await page.locator(".managed-main-nav [data-managed-view='schedule']").click();
  await expect(report).toBeHidden();
});

test("DES-010 Project menu dismisses on outside, Escape and action while retaining recovery", async ({ page }) => {
  await openManaged(page);
  const menu = page.locator(".managed-project-menu");
  const toggle = menu.locator("summary");
  await expect(menu).not.toHaveAttribute("open", "");
  await toggle.click();
  await expect(menu).toHaveAttribute("open", "");
  await page.locator(".managed-main-nav [data-managed-view='schedule']").click();
  await expect(menu).not.toHaveAttribute("open", "");
  await toggle.click();
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await toggle.click();
  await menu.getByRole("button", { name: "Inspect Save State" }).click();
  await expect(menu).not.toHaveAttribute("open", "");
  const inspect = page.getByRole("dialog", { name: "Inspect Save State" });
  await expect(inspect.getByText("Inspection: READY")).toBeVisible();
  await inspect.getByRole("button", { name: "Close" }).click();
});


test("DES-012 Finish-date multi-select filters real XLSX rows and preserves parent WBS context", async ({ page }) => {
  await page.goto(fileUrl);
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "SPT-WBS_DES010_Synthetic_UAT.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(packagedUatBase64, "base64"),
  });
  await expect(page.locator(".task-row")).toHaveCount(23);
  await page.locator("#filterToggle").click();
  const group = page.locator("#managedFinishFilterGroup");
  await expect(group).toBeVisible();
  await expect(group.getByLabel("Finish date Nov 12, 2026")).toBeVisible();
  await group.locator('input[value="2026-11-12"]').check();
  await expect(page.locator("#filterCount")).toHaveText("1");
  await expect(page.locator("#managedFinishSelection")).toHaveText("(1)");
  await expect(page.locator("#gridHeader [data-filtered-column='finish'] .managed-filtered-column-mark")).toHaveText("▼");
  await expect(page.locator(".task-row").filter({ hasText: "Prototype schedule workspace" })).toBeVisible();
  await expect(page.locator(".task-row").filter({ hasText: "Experience Design" }).first()).toBeVisible();
  await expect(page.locator(".task-row").filter({ hasText: "Implement controlled Save workflow" })).toHaveCount(0);
  // A second date belongs to the same column and must not increase the
  // badge from 1 to 2; this is real multi-select, not a mock-only affordance.
  await group.locator('input[value="2026-11-18"]').check();
  await expect(page.locator("#filterCount")).toHaveText("1");
  await expect(page.locator("#managedFinishSelection")).toHaveText("(2)");
  await expect(page.locator(".task-row").filter({ hasText: "Implement controlled Save workflow" })).toBeVisible();
  await page.locator("#filterDone").click();

  // Hiding Finish removes the actual restriction and its heading indicator.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.locator('#columnOptions input[data-column="finish"]').uncheck();
  await expect(page.locator("#filterCount")).toBeHidden();
  await expect(page.locator("#gridHeader [data-filtered-column='finish']")).toHaveCount(0);
  await settings.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".task-row")).toHaveCount(23);
  await page.locator("#filterToggle").click();
  await expect(group).toBeHidden();
  await page.locator("#filterDone").click();
});

test("DES-012 Gantt filter badge counts filtered columns, not checked values, and marks each filtered heading", async ({ page }) => {
  await page.goto(fileUrl);
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "SPT-WBS_DES010_Synthetic_UAT.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(packagedUatBase64, "base64"),
  });
  await expect(page.locator(".task-row")).toHaveCount(23);
  const badge = page.locator("#filterCount");
  const headers = page.locator("#gridHeader");
  await expect(badge).toBeHidden();
  await expect(headers.locator(".managed-filtered-column")).toHaveCount(0);
  await page.locator("#filterToggle").click();
  await page.locator('#filterStatuses input[value="At Risk"]').check();
  await page.locator('#filterStatuses input[value="Blocked"]').check();
  await expect(page.locator("#statusSelection")).toHaveText("(2)");
  await expect(badge).toHaveText("1");
  await expect(badge).toHaveAttribute("data-filter-meaning", "columns");
  await expect(page.locator("#filterToggle")).toHaveAttribute("aria-label", "Filters, 1 column filtered");
  await expect(headers.locator(".managed-filtered-column")).toHaveCount(1);
  await expect(headers.locator('[data-filtered-column="status"] .managed-filtered-column-mark')).toHaveText("▼");
  await expect(headers.locator('[data-filtered-column="status"]')).toHaveAttribute("title", "Status: 2 filter values selected");

  await page.locator("#filterOwners input").first().check();
  await expect(badge).toHaveText("2");
  await expect(page.locator("#filterToggle")).toHaveAttribute("aria-label", "Filters, 2 columns filtered");
  await expect(headers.locator(".managed-filtered-column")).toHaveCount(2);
  await expect(headers.locator('[data-filtered-column="owner"] .managed-filtered-column-mark')).toHaveText("▼");
  await expect(headers.locator('[data-filtered-column="wbs"]')).toHaveCount(0);
  await expect(headers.locator('[data-filtered-column="task"]')).toHaveCount(0);
  await expect(headers.locator('[data-filtered-column="finish"]')).toHaveCount(0);

  await page.locator("#clearInPopover").click();
  await expect(badge).toBeHidden();
  await expect(headers.locator(".managed-filtered-column")).toHaveCount(0);
  await expect(page.locator("#filterToggle")).toHaveAttribute("aria-label", "Filters");
  await expect(page.locator("#clearFilters")).toBeHidden();
});

test("DES-012 column markers follow real visible-column preferences; hide inactive is not a filtered column", async ({ page }) => {
  await page.goto(fileUrl);
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "SPT-WBS_DES010_Synthetic_UAT.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(packagedUatBase64, "base64"),
  });
  // setInputFiles returns after dispatch, not when the async XLSX import has
  // committed. Without this real readiness gate, a later import publication
  // resets the new session's ViewState and makes Hide inactive appear lost.
  await expect(page.locator(".task-row")).toHaveCount(23);
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
  await page.locator("#hideInactive").check();
  await expect(page.locator("#hideInactive")).toBeChecked();
  await expect(page.locator("#filterCount")).toBeHidden();
  await expect(page.locator("#clearFilters")).toBeVisible();
  await page.locator("#filterToggle").click();
  await page.locator('#filterStatuses input[value="At Risk"]').check();
  await expect(page.locator("#filterCount")).toHaveText("1");
  await expect(page.locator('#gridHeader [data-filtered-column="status"]')).toBeVisible();
  await page.locator("#filterDone").click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.locator('#columnOptions input[data-column="status"]').uncheck();
  await expect(page.locator("#filterCount")).toBeHidden();
  await expect(page.locator('#gridHeader [data-filtered-column="status"]')).toHaveCount(0);
  await settings.getByRole("button", { name: "Close" }).click();
  await expect(page.locator("#hideInactive")).toBeChecked();
  await expect(page.locator("#clearFilters")).toBeVisible();
  await page.locator("#clearFilters").click();
  await expect(page.locator("#hideInactive")).not.toBeChecked();
  await expect(page.locator("#clearFilters")).toBeHidden();
});

test("DES-010 Gantt scope keeps manual status filters and avoids no-op draft warnings", async ({ page }) => {
  await openManaged(page);
  await page.locator("#filterToggle").click();
  const inProgress = page.locator('#filterStatuses input[value="In Progress"]');
  await inProgress.check();
  await page.locator("#filterDone").click();
  await expect(inProgress).toBeChecked();
  await expect(page.locator(".task-row")).toHaveCount(1);

  const scope = page.locator(".managed-gantt-scope");
  // Workstreams is already selected: clicking again must not reset a manual filter.
  await scope.locator('[data-managed-scope="workstreams"]').click();
  await expect(inProgress).toBeChecked();
  await expect(page.locator(".task-row")).toHaveCount(1);

  await page.getByRole("button", { name: "Edit task" }).click();
  await page.getByLabel("Task title").fill("Pending manual filter preserved");
  await scope.locator('[data-managed-scope="workstreams"]').click();
  await expect(page.getByRole("dialog", { name: "Unsaved changes" })).toBeHidden();
  await expect(page.getByLabel("Task title")).toHaveValue("Pending manual filter preserved");

  // Changing scopes is still a real navigation and remains protected by the shared guard.
  await scope.locator('[data-managed-scope="exceptions"]').click();
  await expect(page.getByRole("dialog", { name: "Unsaved changes" })).toBeVisible();
  await page.getByRole("dialog", { name: "Unsaved changes" }).getByRole("button", { name: "Cancel" }).click();
  await expect(inProgress).toBeChecked();
  await expect(page.getByLabel("Task title")).toHaveValue("Pending manual filter preserved");
  await scope.locator('[data-managed-scope="exceptions"]').click();
  await page.getByRole("dialog", { name: "Unsaved changes" }).getByRole("button", { name: "Discard" }).click();
  await expect(page.locator(".task-row")).toHaveCount(0);
  await scope.locator('[data-managed-scope="workstreams"]').click();
  await expect(inProgress).toBeChecked();
  await expect(page.locator(".task-row")).toHaveCount(1);
});


for (const width of [1440, 1024, 860]) {
  test(`DES-010 managed ${width}px: Inspector is readable, accessible when empty, and workday label concise`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 768 });
    await openManaged(page);
    const inspector = page.locator("#panel");
    await expect(inspector).toBeVisible();
    await expect(page.locator(".managed-global-settings")).toBeVisible();
    await expect(page.locator(".managed-main-nav [data-managed-view='reports']")).toBeVisible();
    await expect(inspector.locator(".dt-rail-card")).toBeVisible();
    const panelBox = await inspector.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(width + 2);
    const gantt = await page.locator("#gantt").boundingBox();
    expect(gantt).not.toBeNull();
    expect(gantt!.height).toBeGreaterThan(260);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.locator("#close").click();
    const empty = page.locator(".managed-empty-detail");
    await expect(empty).toBeVisible();
    await expect(inspector).not.toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("region", { name: "Selected task details" }))
      .toContainText("Select a task to inspect its details.");
    await testInfo.attach(`managed-DES010-empty-inspector-${width}`, {
      body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
    });
    await page.locator(".task-row").first().click();
    await expect(empty).toBeHidden();
    await expect(inspector).not.toHaveAttribute("aria-hidden", "true");
    await expect(inspector).toHaveAttribute("aria-labelledby", "detailTitle");
  });
}

test("Owner UAT: native Edge AbortError reports diagnostic and safe read-only XLSX fallback", async ({ page }) => {
  const messages: string[] = [];
  page.on("pageerror", error => messages.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => { throw new DOMException("The user agent denied folder access", "AbortError"); },
    });
  });
  await page.goto(fileUrl);
  const menu = page.locator(".managed-project-menu");
  await menu.locator("summary").click();
  await menu.getByRole("button", { name: "Choose project folder" }).click();
  await expect(page.locator(".managed-banner")).toContainText("AbortError: The user agent denied folder access");
  await expect(page.locator(".managed-banner")).toContainText("Open XLSX read-only");
  await menu.locator("summary").click();
  const fallback = menu.getByRole("button", { name: "Open XLSX read-only…" });
  await expect(fallback).toBeVisible();
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "SPT-WBS_DES010_Synthetic_UAT.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(packagedUatBase64, "base64"),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded", { timeout: 15000 });
  await expect(page.locator("#title")).toHaveText("SPT-WBS_DES010_Synthetic_UAT");
  await expect(page.locator(".task-row").first()).toBeVisible();
  await page.locator(".task-row").first().click();
  await expect(page.getByRole("button", { name: "Edit task" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save to workbook" })).toHaveCount(0);
  expect(messages).toEqual([]);
});

test("Issue #69: corporate Edge folder denial allows real read-only Report11 Generate in all modes", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => { throw new DOMException("Folder access denied by browser policy", "AbortError"); },
    });
  });
  await page.goto(fileUrl);
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Choose project folder" }).click();
  await expect(page.locator(".managed-banner")).toContainText("AbortError");

  const name = "SPT-WBS_Report11_Synthetic_UAT.xlsx";
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await readFile(path.resolve("dist-managed", name)),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
  await expect(page.locator(".task-row")).toHaveCount(23);
  await page.locator(".task-row").first().click();
  await expect(page.getByRole("button", { name: "Edit task" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save to workbook" })).toHaveCount(0);

  await page.locator(".managed-main-nav [data-managed-view='reports']").click();
  const reports = page.getByRole("dialog", { name: "Output Reports" });
  await expect(reports).toBeVisible();
  // Read-only has no folder write capability but must still permit report generation.
  await expect(reports.getByText(/Reports are read-only. Generating, copying and downloading never modifies Excel/)).toBeVisible();
  await expect(reports.locator(".report11-mode-card.active")).toContainText("Latest Status");
  await reports.getByLabel("Report format").selectOption("text");
  const preview = reports.getByRole("textbox", { name: "Report preview" });
  await reports.getByRole("button", { name: "Generate / Refresh" }).click();
  await expect(reports.getByText(/Enter a Project name before generating/)).toBeVisible();
  await expect(preview).toBeEmpty();

  await reports.getByLabel("Project name").fill("Fictional Enterprise Program");
  await reports.getByRole("button", { name: "Generate / Refresh" }).click();
  await expect(preview).toHaveValue(/LATEST STATUS/);
  await expect(preview).toHaveValue(/Fictional Enterprise Program/);
  await expect(preview).toHaveValue(/DAYS TO GO-LIVE:/);
  await expect(reports.getByText(/Generated status snapshot from committed data/)).toBeVisible();

  await reports.getByLabel("Report mode").selectOption("progress");
  await reports.getByLabel("Report start date").fill("2026-11-09");
  await reports.getByLabel("Report end date").fill("2026-11-10");
  await reports.getByRole("button", { name: "Generate / Refresh" }).click();
  await expect(preview).toHaveValue(/PROGRESS/);

  await reports.getByLabel("Report mode").selectOption("audit");
  await reports.getByRole("button", { name: "Generate / Refresh" }).click();
  await expect(preview).toHaveValue(/Detailed Change Audit/);
  await expect(preview).toHaveValue(/Save events: 3/);
  await expect(preview).toHaveValue(/Field changes: 5/);
  await reports.getByLabel("Report format").selectOption("html");
  const html = await reports.locator("iframe[title='Formatted report preview']").getAttribute("srcdoc");
  expect(html).toContain("Fictional Enterprise Program");
  await testInfo.attach("issue69-readonly-report", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
  expect(errors).toEqual([]);
});

test("Issue #69: invalid read-only import gives visible Generate error instead of a blank silent result", async ({ page }) => {
  await page.goto(fileUrl);
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "not-a-workbook.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("not valid XLSX bytes"),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only workbook preview failed");
  await page.locator(".managed-main-nav [data-managed-view='reports']").click();
  const reports = page.getByRole("dialog", { name: "Output Reports" });
  await reports.getByLabel("Project name").fill("Should not generate");
  await reports.getByRole("button", { name: "Generate / Refresh" }).click();
  await expect(reports.getByText("Choose and load a workbook before generating a report.")).toBeVisible();
  // The HTML format is active by default, so the plain-text textarea is
  // intentionally hidden from the accessibility tree. Inspect its value
  // directly without changing the selected preview format.
  await expect(reports.locator('textarea[aria-label="Report preview"]')).toHaveValue("");
  await expect(reports.getByRole("button", { name: "Copy for Outlook" })).toBeDisabled();
});

test("Owner UAT: non-XLSX read-only fallback retains previous state without a write", async ({ page }) => {
  await page.goto(fileUrl);
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "not-a-workbook.txt", mimeType: "text/plain", buffer: Buffer.from("bad"),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only workbook preview failed");
  await expect(page.locator(".task-row")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save to workbook" })).toHaveCount(0);
});

test("Owner UAT kit: packaged 23-task XLSX imports, allows direct Save and writes real History", async ({ page }) => {
  const fileName = "SPT-WBS_DES010_Synthetic_UAT.xlsx";
  const messages: string[] = [];
  page.on("pageerror", error => messages.push("JS: " + error.message));
  page.on("console", message => { if (message.type() === "error") messages.push(message.text()); });
  page.on("dialog", async dialog => { await dialog.accept(); });
  await page.addInitScript(({ encoded, name }) => {
    const decoded = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const files = new Map<string, Uint8Array>([[name, decoded]]);
    const dir = {
      kind: "directory",
      name: "disposable-owner-uat",
      async *entries() {
        for (const fileName of files.keys()) yield [fileName, { kind:"file", name:fileName }];
      },
      async getFileHandle(fileName: string, options?: { create?: boolean }) {
        if (!files.has(fileName)) {
          if (!options?.create) throw new DOMException("not found", "NotFoundError");
          files.set(fileName, new Uint8Array());
        }
        return {
          kind: "file",
          name: fileName,
          async getFile() {
            return new File([new Uint8Array(files.get(fileName)!)], fileName, {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
          },
          async createWritable() {
            let pending = new Uint8Array();
            return {
              async write(data: Uint8Array) { pending = new Uint8Array(data); },
              async close() { files.set(fileName, pending); },
            };
          },
        };
      },
      async removeEntry(fileName: string) { files.delete(fileName); },
    };
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true, value: async () => dir,
    });
    Object.defineProperty(window, "__ownerUatFiles", {
      configurable: true, value: files,
    });
  }, { encoded: packagedUatBase64, name:fileName });
  await page.goto(fileUrl);
  const menu = page.locator(".managed-project-menu");
  await menu.locator("summary").click();
  await menu.getByRole("button", { name:"Choose project folder" }).click();
  const banner = page.locator(".managed-banner");
  await expect(banner, "Packaged UAT workbook must import; browser errors: " + messages.join("; ")).toContainText(
    "Workbook ready", { timeout:15000 },
  );
  await expect(page.locator("#title")).toHaveText("SPT-WBS_DES010_Synthetic_UAT");
  await expect(page.locator(".task-row").first()).toBeVisible();
  await expect(page.getByLabel("Active Excel workbook")).toHaveValue(fileName);
  // Must be writable; previous package mistakenly included unsupported AutoFilter.
  await page.locator(".task-row").first().click();
  await expect(page.getByRole("button", { name:"Edit task" })).toBeEnabled();
  await page.getByRole("button", { name:"Edit task" }).click();
  await page.getByLabel("Task title").fill("UAT kit verified synthetic update");
  await page.getByRole("button", { name:"Save to workbook" }).click();
  await expect(banner).toContainText("Verified Save: task and UpdateHistory persisted", { timeout:15000 });
  const after = await page.evaluate(async filename => {
    const files = (window as typeof window & { __ownerUatFiles: Map<string,Uint8Array> }).__ownerUatFiles;
    return { names:[...files.keys()], source:Array.from(files.get(filename)!) };
  },fileName);
  expect(after.names).toContain("SPT-WBS_DES010_Synthetic_UAT.backup.xlsx");
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Uint8Array.from(after.source) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(book.getWorksheet("ProjectWBS")?.getCell("B2").value).toBe("UAT kit verified synthetic update");
  expect(book.getWorksheet("UpdateHistory")).toBeTruthy();
  expect(messages).toEqual([]);
});

test("DES-012 Watch evidence stays Unknown for legacy XLSX in writable and read-only modes", async ({ page }) => {
  await openManaged(page);
  const evidence = page.locator("#detailContent .managed-watch-evidence");
  await expect(evidence).toContainText("Workbook Watch: Unknown");
  await expect(evidence).toContainText("no Green or clearance inferred");
  await expect(page.getByRole("button", { name: "Edit task" })).toBeEnabled();

  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "legacy-watch-preview.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(base64, "base64"),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
  await page.locator(".task-row").first().click();
  await expect(evidence).toContainText("Workbook Watch: Unknown");
  await expect(evidence).toContainText("no Green or clearance inferred");
  await expect(page.getByRole("button", { name: "Edit task" })).toBeDisabled();
});

for (const state of ["Open", "Resolved", "malformed"] as const) {
  test(`five-sheet XLSX ${state}: actual read-only import renders conservative Watch without writes`, async ({ page }) => {
    await openManaged(page);
    const before = await page.evaluate(() => Array.from((window as any).__managedFixtureFiles.entries()).map(([n,b]: any) => [n, Array.from(b)]));
    await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
      name: "five-sheet.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: await projectDataWorkbook(state),
    });
    await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
    await page.locator(".task-row").first().click();
    const evidence = page.locator(".managed-watch-evidence");
    await expect(evidence).toContainText("Workbook Watch: " + (state === "Open" ? "Under Watch" : "Unknown"));
    if (state === "Open") {
      await expect(evidence).toContainText("Supplier <img src=x onerror=alert(1)>");
      await expect(evidence.locator("img")).toHaveCount(0);
      await expect(evidence).toContainText("1 recorded open reason");
    }
    if (state === "malformed") await expect(evidence).toContainText("unavailable");
    await expect(page.getByRole("button", { name: "Edit task" })).toBeDisabled();
    expect(await page.evaluate(() => Array.from((window as any).__managedFixtureFiles.entries()).map(([n,b]: any) => [n, Array.from(b)]))).toEqual(before);
  });
}

test("five-sheet XLSX Manual Watch Add/Resolve survives guarded Save and reopen with audit and predecessor backup", async ({ page }) => {
  page.on("dialog", dialog => dialog.accept());
  const original = await projectDataWorkbook("Resolved");
  await openManaged(page, original.toString("base64"));
  const watch = page.getByRole("region", { name: "Recorded Under Watch reasons" });
  await page.getByRole("button", { name: "Add manual reason", exact: true }).click();
  await page.getByLabel("Watch reason title").fill("New supplier dependency");
  await page.getByLabel("Watch reason details").fill("Synthetic manual record");
  await page.getByRole("button", { name: "Save manual reason", exact: true }).click();
  await expect(watch).toContainText("Under Watch · 1 open");
  const source = async () => page.evaluate(() => Array.from((window as any).__managedFixtureFiles.get("synthetic-demo.xlsx") as Uint8Array));
  const addedBytes = await source();
  const added = new ExcelJS.Workbook();
  await added.xlsx.load(Buffer.from(addedBytes));
  expect(added.getWorksheet("WatchReasons")!.getRow(3).getCell(2).value).toBe("501");
  const reasonId = added.getWorksheet("WatchReasons")!.getCell("A3").value;
  expect(added.getWorksheet("ProjectAudit")!.rowCount).toBeGreaterThan(2);
  expect(added.getWorksheet("ProjectWBS")!.getCell("F2").value).toBe("In Progress");
  const backup = await page.evaluate(() => Array.from((window as any).__managedFixtureFiles.get("synthetic-demo.backup.xlsx") as Uint8Array));
  expect(Buffer.from(backup)).toEqual(original);
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Reload workbook", exact: true }).click();
  await expect(page.locator(".managed-banner")).toContainText("Workbook ready. Select a task.");
  await page.locator(".task-row").first().click();
  await expect(watch).toContainText("New supplier dependency");
  await page.getByRole("button", { name: "Resolve this reason", exact: true }).click();
  await page.getByLabel("Watch resolution note").fill("Mitigation recorded");
  await page.getByRole("button", { name: "Confirm reason resolution", exact: true }).click();
  await expect(watch).toContainText("No recorded open reasons");
  const resolved = new ExcelJS.Workbook();
  await resolved.xlsx.load(Buffer.from(await source()));
  expect(resolved.getWorksheet("WatchReasons")!.getCell("A3").value).toBe(reasonId);
  expect(resolved.getWorksheet("WatchReasons")!.getCell("E3").value).toBe("Resolved");
  expect(resolved.getWorksheet("WatchReasons")!.getCell("N3").value).toBe("Mitigation recorded");
  expect(resolved.getWorksheet("ProjectAudit")!.rowCount).toBeGreaterThan(added.getWorksheet("ProjectAudit")!.rowCount);
  expect(Buffer.from(await page.evaluate(() => Array.from((window as any).__managedFixtureFiles.get("synthetic-demo.backup.xlsx") as Uint8Array)))).toEqual(Buffer.from(addedBytes));
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "reopened.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await source()),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
  await page.locator(".task-row").first().click();
  await expect(watch).toContainText("No recorded open reasons");
  await expect(page.getByRole("button", { name: "Add manual reason", exact: true })).toBeDisabled();
  await watch.locator("summary").click();
  await expect(watch).toContainText("Mitigation recorded");
});

test("five-sheet XLSX Calendar discards drafts, saves inclusive blackout and agrees with Task Detail and Schedule", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-14T00:00:00.000Z"));
  page.on("dialog", dialog => dialog.accept());
  await openManaged(page, (await projectDataWorkbook("Resolved")).toString("base64"));
  const openCalendar = async () => {
    await page.locator(".managed-project-menu summary").click();
    await page.getByRole("button", { name: "Project Calendar", exact: true }).click();
    return page.getByRole("dialog", { name: "Project Calendar", exact: true });
  };
  let calendar = await openCalendar();
  await calendar.getByLabel("Shared Project name").fill("Discard this name");
  await calendar.getByRole("button", { name: "Discard and close" }).click();
  calendar = await openCalendar();
  await expect(calendar.getByLabel("Shared Project name")).toHaveValue("Synthetic shared project");
  await calendar.getByLabel("Enable project blackout").check();
  await calendar.getByLabel("Project blackout start").fill("2026-11-14");
  await calendar.getByLabel("Project blackout end").fill("2026-11-17");
  await calendar.getByLabel("Project blackout label").fill("Synthetic blackout including weekend");
  await calendar.getByRole("button", { name: "Save project blackout", exact: true }).click();
  await expect(calendar).not.toBeVisible();
  await expect(page.locator(".dt-remaining")).toContainText("3 days remaining");
  await expect(page.locator('.bar[data-task-id="501"]')).toHaveAttribute("title", /Workbook Days Remaining: \+3 days/);
  calendar = await openCalendar();
  await expect(calendar.getByLabel("Project blackout end")).toHaveValue("2026-11-17");
  await calendar.getByRole("button", { name: "Discard and close" }).click();
});

test("five-sheet XLSX same-source Watch drives Meeting Review, Task Detail and factual Reports in read-only mode", async ({ page }, testInfo) => {
  await openManaged(page, (await projectDataWorkbook("Open")).toString("base64"));
  const before = await page.evaluate(() => Array.from((window as any).__managedFixtureFiles.entries()).map(([n,b]: any) => [n, Array.from(b)]));
  await page.getByLabel("Choose an XLSX for read-only preview").setInputFiles({
    name: "shared-meeting-report.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await projectDataWorkbook("Open"),
  });
  await expect(page.locator(".managed-banner")).toContainText("Read-only preview loaded");
  await page.getByRole("button", { name: "Meeting Review", exact: true }).click();
  const agenda = page.getByRole("region", { name: "Meeting agenda", exact: true });
  await expect(agenda).toBeVisible();
  await expect(agenda).toContainText("1 Under Watch · 1 recorded Open reasons");
  const row = agenda.locator('.managed-meeting-task[data-task-id="501"]');
  await expect(row).toContainText("In Progress");
  await expect(row).toContainText("Under Watch · 1 Open / 0 Resolved");
  await row.click();
  await expect(page.locator(".managed-watch-evidence")).toContainText("Supplier <img");
  await expect(page.getByRole("button", { name: "Edit task", exact: true })).toBeDisabled();
  await page.getByLabel("Search meeting tasks").fill("no-match");
  await expect(agenda.locator(".managed-meeting-task")).toHaveCount(0);
  await page.getByLabel("Search meeting tasks").fill("");
  await expect(agenda.locator(".managed-meeting-task")).toHaveCount(1);
  await agenda.locator("summary").click();
  await agenda.getByLabel("Meeting owner filter").selectOption(["Owner A"]);
  await expect(agenda.locator(".managed-meeting-task")).toHaveCount(1);
  await testInfo.attach("meeting-recorded-watch-1440", { body: await page.screenshot(), contentType: "image/png" });
  await page.locator('.managed-main-nav [data-managed-view="reports"]').click();
  const reports = page.getByRole("dialog", { name: "Output Reports" });
  await reports.getByLabel("Project name").fill("Local report title");
  await reports.getByLabel("Report format").selectOption("text");
  for (const mode of ["status", "progress"] as const) {
    await reports.getByLabel("Report mode").selectOption(mode);
    if (mode === "progress") {
      await reports.getByLabel("Report start date").fill("2026-11-01");
      await reports.getByLabel("Report end date").fill("2026-11-14");
    }
    await reports.getByRole("button", { name: "Generate / Refresh" }).click();
    await expect(reports.getByRole("textbox", { name: "Report preview" })).toHaveValue(/Project: Local report title/);
    await expect(reports.getByRole("textbox", { name: "Report preview" })).toHaveValue(/Under Watch · 1 Open \/ 0 Resolved/);
    await reports.getByLabel("Report format").selectOption("html");
    const html = await reports.locator("iframe").getAttribute("srcdoc");
    expect(html).toContain("Supplier &lt;img");
    expect(html).not.toContain("<img src=x");
    await reports.getByLabel("Report format").selectOption("text");
  }
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(agenda).not.toBeVisible();
  expect(await page.evaluate(() => Array.from((window as any).__managedFixtureFiles.entries()).map(([n,b]: any) => [n, Array.from(b)]))).toEqual(before);
});
