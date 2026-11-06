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
    Object.defineProperty(window, "__managedFixtureFiles", { configurable: true, value: files });
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

  await page.getByRole("button", { name: "History", exact: true }).click();
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
  await expect(history.getByText(/2 field change\(s\)/)).toBeVisible();
  await expect(history.getByLabel("History task filter")).toHaveValue("501");
  expect(await history.locator("img").count()).toBe(0);
  await history.getByText("Expand full before / after").click();
  await expect(history.locator("pre")).toContainText("<img src=x onerror=alert('x')>");
  await history.getByLabel("History field filter").selectOption("Title");
  await expect(history.getByText(/1 field change\(s\)/)).toBeVisible();
  await expect(history.locator(".managed-history-row strong")).toContainText("Title");
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
  await page.getByRole("button", { name: "History", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Change History" });
  await expect(history.getByText(/Times are displayed in Asia\/Tokyo/)).toBeVisible();
  await expect(history.getByText(/1 saved change event/)).toBeVisible();
});


test("Output Reports uses committed data only with unsaved draft, then copies exactly the fixed preview", async ({ page }) => {
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
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  const preview = report.getByRole("textbox", { name: "Report preview" });
  await expect(preview).toHaveValue(/Latest Status Report/);
  await expect(preview).toHaveValue(/Synthetic milestone/);
  expect(await preview.inputValue()).not.toContain("Not yet committed");
  const snapshot = await preview.inputValue();
  await report.getByLabel("Report mode").selectOption("updates");
  await expect(preview).toHaveValue(snapshot); // options alone do not refresh snapshot
  await report.getByRole("button", { name: "Copy Report" }).click();
  await expect(report.getByText(/Copied exactly/)).toBeVisible();
  const copied = await page.evaluate(() =>
    (window as unknown as { __copiedReport: string }).__copiedReport);
  expect(copied).toBe(snapshot);
  await report.getByRole("button", { name: "Close" }).click();
  await expect(page.getByLabel("Task title")).toHaveValue("Not yet committed");
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
});

test("Update Report generates from persisted history only, honors selected timezone and never rewrites workbook", async ({ page }) => {
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
  await report.getByLabel("Report mode").selectOption("updates");
  await report.getByLabel("Report start date").fill("2026-01-01");
  await report.getByLabel("Report end date").fill("2027-12-31");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  const preview = report.getByRole("textbox", { name: "Report preview" });
  await expect(preview).toHaveValue(/Update Report/);
  await expect(preview).toHaveValue(/Logical Save events: 1/);
  await expect(preview).toHaveValue(/Field-change rows: 2/);
  await expect(preview).toHaveValue(/ChangeSetID:/);
  await expect(preview).toHaveValue(/Confirmed progress review/);
  await expect(preview).toHaveValue(/Asia\/Tokyo/);
  const text = await preview.inputValue();
  await report.getByLabel("Report end date").fill("1900-01-01");
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  await expect(report.getByText(/Report not generated: Choose valid start\/end dates/)).toBeVisible();
  await expect(preview).toHaveValue(text); // failed refresh retains verified snapshot
  const afterReport = await page.evaluate(() =>
    Array.from((window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  expect(afterReport).toEqual(beforeReport);
});

test("Output Report clipboard denied shows accurate failure and keeps snapshot available for manual copy", async ({ page }) => {
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
  await report.getByRole("button", { name: "Generate / Refresh" }).click();
  const preview = report.getByRole("textbox", { name: "Report preview" });
  const original = await preview.inputValue();
  await report.getByRole("button", { name: "Copy Report" }).click();
  await expect(report.getByText(/Copy failed: Denied/)).toBeVisible();
  await expect(preview).toHaveValue(original);
});


test("Stage A inspector shows READY state without modifying any workbook bytes", async ({ page }) => {
  await openManaged(page);
  const source = await page.evaluate(() =>
    Array.from((window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  await page.locator("#close").click();
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
