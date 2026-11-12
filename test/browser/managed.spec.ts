import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

let fileUrl = "";
let base64 = "";
let sharedProjectBase64 = "";
let packagedUatBase64 = "";

test.beforeAll(async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("ProjectWBS");
  sheet.addRow(["ID", "Title", "WBSCode", "TaskType", "Progress", "TaskStatus",
    "AssignedTo", "Updates", "PlannedStart", "PlannedEnd"]);
  sheet.addRow([501, "Synthetic milestone", "1.2", "Task", 20, "In Progress",
    "Owner A", "Initial update", "2026-11-02", "2026-11-06"]);
  base64 = Buffer.from(await book.xlsx.writeBuffer()).toString("base64");
  // Shared-project fixture alone has a future finish for calendar day-count UI tests.
  sheet.getCell("J2").value = "2026-11-20";
  // Same Task workbook with project-owned Excel extension. The displayed
  // project name is deliberately different from the disk filename.
  const meta = book.addWorksheet("ProjectMeta");
  meta.addRow(["Key", "Value"]);
  meta.addRow(["ProjectID", "bd95a399-257e-4b42-ac0e-fb6ee984c1aa"]);
  meta.addRow(["ProjectName", "Tokyo & Global Initiative"]);
  meta.addRow(["ProjectDataSchemaVersion", "0.1.2"]);
  const calendar = book.addWorksheet("ProjectCalendar");
  calendar.addRow(["BlackoutID", "Enabled", "StartDate", "EndDate", "Label", "ModifiedUTC"]);
  calendar.addRow(["7e4d09da-832e-4647-9202-8cbb8f8704d2", true,
    "2026-11-17", "2026-11-19", "Project closure", "2026-11-12T02:00:00.000Z"]);
  book.addWorksheet("WatchReasons").addRow([
    "ReasonID", "TaskID", "Origin", "RuleCode", "State", "Title",
    "Details", "EvidenceRef", "OpenedUTC", "OpenedBy", "LastReviewedUTC",
    "ResolvedUTC", "ResolvedBy", "ResolutionNote",
  ]);
  book.addWorksheet("ProjectCommitments").addRow([
    "CommitmentID", "TaskID", "AcceptedFinishDate", "AcceptedUTC",
    "AcceptedBy", "PreviousCommitmentID", "Rationale", "EvidenceRef",
  ]);
  book.addWorksheet("ProjectAudit").addRow([
    "EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID",
    "TaskID", "Action", "Field", "OldValue", "NewValue",
    "ActorLabel", "ActorProvenance", "Source", "AppVersion",
  ]);
  sharedProjectBase64 = Buffer.from(await book.xlsx.writeBuffer()).toString("base64");
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
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Choose project folder" }).click();
  await expect(page.locator("#title")).toHaveText("Project name not configured");
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.locator(".task-row").first().click();
  await expect(page.locator("#panel")).toHaveClass(/open/);
  await expect(page.getByRole("button", { name: "Edit task" })).toBeEnabled();
  await expect(page.locator(".source-record")).toBeHidden();
}

async function openSharedManaged(page: import("@playwright/test").Page, fixture = sharedProjectBase64) {
  await page.addInitScript(({ encoded }) => {
    const decoded = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    const files = new Map<string, Uint8Array>([["fixture-not-project-name.xlsx", decoded]]);
    const dir = {
      kind: "directory", name: "shared-project-synthetic",
      async getFileHandle(name: string, opts?: { create?: boolean }) {
        if (!files.has(name)) {
          if (!opts?.create) throw new DOMException("missing", "NotFoundError");
          files.set(name, new Uint8Array());
        }
        return {
          kind: "file", name,
          async getFile() {
            return new File([new Uint8Array(files.get(name)!)], name,
              { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          },
          async createWritable() {
            let pending = new Uint8Array();
            return {
              async write(next: Uint8Array) { pending = Uint8Array.from(next); },
              async close() { files.set(name, pending); },
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
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: async () => dir });
  }, { encoded: fixture });
  await page.goto(fileUrl);
  await page.locator(".managed-project-menu summary").click();
  await page.getByRole("button", { name: "Choose project folder" }).click();
  await expect(page.locator("#title")).toHaveText("Tokyo & Global Initiative");
}

test("F5d manually Add and Resolve Watch reason through verified Excel Save and audit", async ({ page }) => {
  page.on("dialog", async dialog => { await dialog.accept(); });
  await openSharedManaged(page);
  await page.locator(".task-row").first().click();
  const watch = page.locator(".managed-watch");
  await expect(watch).toContainText("Unknown");
  await expect(watch).toContainText("not Green or Clear");
  await watch.getByRole("button", { name: "Add manual reason" }).click();
  await watch.getByLabel("Watch reason title").fill("Supplier delivery on hold");
  await watch.getByLabel("Watch reason details").fill("Stakeholder escalation");
  await watch.getByLabel("Watch evidence reference").fill("Meeting note 11/13");
  await watch.getByRole("button", { name: "Save manual reason" }).click();
  await expect(watch).toContainText("Under Watch · 1 open", { timeout: 20000 });
  await expect(watch).toContainText("Supplier delivery on hold");
  await expect(watch).toContainText("unverified");
  await expect(watch).toContainText("Workbook audit reference recorded");
  const first = await page.evaluate(() => Array.from(
    (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("fixture-not-project-name.xlsx")!));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(first) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(workbook.getWorksheet("WatchReasons")!.getCell("B2").value).toBe("501");
  expect(workbook.getWorksheet("WatchReasons")!.getCell("C2").value).toBe("Manual");
  expect(workbook.getWorksheet("WatchReasons")!.getCell("E2").value).toBe("Open");
  expect(workbook.getWorksheet("WatchReasons")!.getCell("F2").value).toBe("Supplier delivery on hold");
  expect(workbook.getWorksheet("ProjectAudit")!.rowCount).toBeGreaterThan(1);
  expect(workbook.getWorksheet("ProjectCommitments")!.rowCount).toBe(1);
  expect(workbook.getWorksheet("UpdateHistory")!.rowCount).toBe(1);

  await watch.getByRole("button", { name: "Resolve this reason" }).click();
  await watch.getByLabel("Watch resolution note").fill("Vendor delivered replacement");
  await watch.getByRole("button", { name: "Confirm reason resolution" }).click();
  await expect(watch).toContainText("Unknown", { timeout: 20000 });
  await expect(watch).toContainText("Resolved history · 1");
  await expect(watch).not.toContainText("Under Watch · 1 open");
  await watch.locator("details.managed-watch-history summary").click();
  await expect(watch).toContainText("Vendor delivered replacement");
  const final = await page.evaluate(() => Array.from(
    (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.get("fixture-not-project-name.xlsx")!));
  const after = new ExcelJS.Workbook();
  await after.xlsx.load(Uint8Array.from(final) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(after.getWorksheet("WatchReasons")!.getCell("E2").value).toBe("Resolved");
  expect(after.getWorksheet("WatchReasons")!.getCell("N2").value).toBe("Vendor delivered replacement");
  expect(after.getWorksheet("ProjectAudit")!.rowCount).toBeGreaterThan(workbook.getWorksheet("ProjectAudit")!.rowCount);
  expect(after.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
});

test("F5d Cancel and stale-source refusal preserve the unsaved Watch draft", async ({ page }) => {
  page.on("dialog", async dialog => { await dialog.accept(); });
  await openSharedManaged(page);
  await page.locator(".task-row").first().click();
  const watch = page.locator(".managed-watch");
  await watch.getByRole("button", { name: "Add manual reason" }).click();
  await watch.getByLabel("Watch reason title").fill("Discarded draft");
  await watch.getByRole("button", { name: "Cancel Watch edit" }).click();
  await expect(watch).toContainText("Unknown");
  const names = await page.evaluate(() =>
    [...(window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.keys()]);
  expect(names).toEqual(["fixture-not-project-name.xlsx"]);

  await watch.getByRole("button", { name: "Add manual reason" }).click();
  await watch.getByLabel("Watch reason title").fill("Keep unsaved input");
  await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    const name = "fixture-not-project-name.xlsx";
    const bytes = Uint8Array.from(files.get(name)!);
    bytes[0] ^= 1; // Simulate a changed external canonical source.
    files.set(name, bytes);
  });
  await watch.getByRole("button", { name: "Save manual reason" }).click();
  await expect(watch).toContainText("NOT verified", { timeout: 20000 });
  await expect(watch.getByLabel("Watch reason title")).toHaveValue("Keep unsaved input");
  const afterNames = await page.evaluate(() =>
    [...(window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> })
      .__managedFixtureFiles.keys()]);
  expect(afterNames).toEqual(["fixture-not-project-name.xlsx"]);
});

test("F5d recorded Automatic Watch reasons remain read-only, never inferred Green", async ({ page }) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(sharedProjectBase64, "base64") as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  workbook.getWorksheet("WatchReasons")!.addRow([
    "ed58f70a-126e-4dce-ace1-b578dc5c290e", "501", "Automatic",
    "UNAPPROVED_RULE", "Open", "Recorded threshold event",
    "Rule is not independently verified", null, "2026-11-12T02:00:00.000Z",
    "Unverified editor", null, null, null, null,
  ]);
  await openSharedManaged(page, Buffer.from(await workbook.xlsx.writeBuffer()).toString("base64"));
  await page.locator(".task-row").first().click();
  const watch = page.locator(".managed-watch");
  await expect(watch).toContainText("Under Watch · 1 open");
  await expect(watch).toContainText("Recorded automatic");
  await expect(watch).toContainText("read-only until its rule");
  await expect(watch.getByRole("button", { name: "Resolve this reason" })).toHaveCount(0);
  await expect(watch.getByRole("button", { name: "Add manual reason" })).toBeEnabled();
});

test("managed shared ProjectName and committed blackout come from Excel, not filename or local preferences", async ({ page }) => {
  await openSharedManaged(page);

  await expect(page.locator("#title")).toHaveText("Tokyo & Global Initiative");
  await expect(page).toHaveTitle("Tokyo & Global Initiative — SPT-WBS");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings.getByText("Project Calendar", { exact: true })).toBeVisible();
  await expect(settings).toContainText(
    "Tokyo & Global Initiative · Committed blackout: 2026-11-17 – 2026-11-19",
  );
  await expect(settings).toContainText("Shared Excel workbook settings");
  await settings.getByRole("button", { name: "Close" }).click();
  const projectMenu = page.locator(".managed-project-menu");
  if (await projectMenu.getAttribute("open") === null) {
    await projectMenu.locator("summary").click();
  }
  await page.locator("#reload").click();
  await expect(page.locator("#title")).toHaveText("Tokyo & Global Initiative");
  await expect(page).toHaveTitle("Tokyo & Global Initiative — SPT-WBS");
});

test("F4d managed Schedule and Task Detail use saved Excel blackout and refresh after verified Disable", async ({ page }) => {
  // 2026-11-16 in Tokyo; range November 17–20 contains four weekdays.
  await page.clock.install({ time: new Date("2026-11-16T01:00:00Z") });
  page.on("dialog", async dialog => { await dialog.accept(); });
  await openSharedManaged(page);
  await expect(page.locator("#calendarSettings")).toBeHidden();
  await page.locator(".task-row").first().click();
  await expect(page.locator(".workdays-detail strong")).toContainText("1 day remaining");
  await expect(page.locator(".bar").first()).toHaveAttribute("title", /\+1 day/);

  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings).toContainText("Committed blackout: 2026-11-17 – 2026-11-19");
  await settings.getByRole("button", { name: "Edit Project Calendar" }).click();
  await settings.getByLabel("Enable project blackout").uncheck();
  await settings.getByRole("button", { name: "Save to shared workbook" }).click();
  await expect(settings).toContainText("Committed blackout: No enabled blackout", { timeout: 20_000 });
  await settings.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".workdays-detail strong")).toContainText("4 days remaining");
  await expect(page.locator(".bar").first()).toHaveAttribute("title", /\+4 days/);
});

test("F4c Calendar Cancel discards draft without changing workbook, audit or local preferences", async ({ page }) => {
  await openSharedManaged(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Edit Project Calendar" }).click();
  await settings.getByLabel("Blackout start").fill("2026-11-18");
  await settings.getByLabel("Blackout end").fill("2026-11-20");
  await settings.getByRole("button", { name: "Cancel calendar edit" }).click();
  await expect(settings).toContainText("Shared workbook unchanged");
  await expect(settings).toContainText("Committed blackout: 2026-11-17 – 2026-11-19");
  const names = await page.evaluate(() =>
    [...(window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles.keys()]);
  expect(names).toEqual(["fixture-not-project-name.xlsx"]);
});

test("F5b dirty Calendar draft blocks Settings Close until explicit discard confirmation", async ({ page }) => {
  await openSharedManaged(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Edit Project Calendar" }).click();
  await settings.getByLabel("Blackout start").fill("2026-11-18");

  page.once("dialog", async dialog => {
    expect(dialog.type()).toBe("confirm");
    await dialog.dismiss();
  });
  await settings.getByRole("button", { name: "Close", exact: true }).click();
  await expect(settings).toBeVisible();
  await expect(settings.getByLabel("Blackout start")).toHaveValue("2026-11-18");

  page.once("dialog", async dialog => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await settings.getByRole("button", { name: "Close", exact: true }).click();
  await expect(settings).toBeHidden();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(settings).toContainText("Committed blackout: 2026-11-17 – 2026-11-19");
});

test("F5b Escape refuses to close unsaved Calendar edit without confirmation", async ({ page }) => {
  await openSharedManaged(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Edit Project Calendar" }).click();
  await settings.getByLabel("Blackout description").fill("Uncommitted stakeholder hold");
  page.once("dialog", async dialog => {
    expect(dialog.type()).toBe("confirm");
    await dialog.dismiss();
  });
  await page.keyboard.press("Escape");
  await expect(settings).toBeVisible();
  await expect(settings.getByLabel("Blackout description")).toHaveValue("Uncommitted stakeholder hold");
  await settings.getByRole("button", { name: "Cancel calendar edit" }).click();
  await expect(settings).toContainText("Shared workbook unchanged");
  await settings.getByRole("button", { name: "Close", exact: true }).click();
  await expect(settings).toBeHidden();
});

test("F4c Calendar Save commits verified workbook and project audit; Disable is a separate Save", async ({ page }) => {
  page.on("dialog", async dialog => { await dialog.accept(); });
  await openSharedManaged(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Edit Project Calendar" }).click();
  await settings.getByLabel("Blackout start").fill("2026-11-18");
  await settings.getByLabel("Blackout end").fill("2026-11-20");
  await settings.getByLabel("Blackout description").fill("Updated shared office closure");
  await settings.getByRole("button", { name: "Save to shared workbook" }).click();
  await expect(settings).toContainText("Committed blackout: 2026-11-18 – 2026-11-20", { timeout: 20_000 });
  await expect(page.locator("#title")).toHaveText("Tokyo & Global Initiative");

  await settings.getByRole("button", { name: "Edit Project Calendar" }).click();
  await settings.getByLabel("Enable project blackout").uncheck();
  await settings.getByRole("button", { name: "Save to shared workbook" }).click();
  await expect(settings).toContainText("Committed blackout: No enabled blackout", { timeout: 20_000 });
  const result = await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    return { names: [...files.keys()], source: Array.from(files.get("fixture-not-project-name.xlsx")!) };
  });
  expect(result.names).toContain("fixture-not-project-name.backup.xlsx");
  expect(result.names).not.toContain("fixture-not-project-name.stage.xlsx");
  expect(result.names).not.toContain("fixture-not-project-name.pending.json");
  const saved = new ExcelJS.Workbook();
  await saved.xlsx.load(Uint8Array.from(result.source) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(saved.getWorksheet("ProjectCalendar")!.getCell("B2").value).toBe(false);
  expect(saved.getWorksheet("ProjectCalendar")!.getCell("C2").value).toBe("2026-11-18");
  expect(saved.getWorksheet("ProjectAudit")!.rowCount).toBeGreaterThan(1);
  expect(saved.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
});

test("F4c legacy first project Save requires name and creates all five audited sheets explicitly", async ({ page }) => {
  page.on("dialog", async dialog => { await dialog.accept(); });
  await openManaged(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Edit Project Calendar" }).click();
  await settings.getByRole("button", { name: "Save to shared workbook" }).click();
  await expect(settings).toContainText("A shared project name is required");
  await settings.getByLabel("New shared project name").fill("Team Delivery North");
  await settings.getByLabel("Enable project blackout").check();
  await settings.getByLabel("Blackout start").fill("2026-12-18");
  await settings.getByLabel("Blackout end").fill("2026-12-21");
  await settings.getByRole("button", { name: "Save to shared workbook" }).click();
  await expect(page.locator("#title")).toHaveText("Team Delivery North", { timeout: 20_000 });
  await expect(settings).toContainText("Committed blackout: 2026-12-18 – 2026-12-21");
  const bytes = await page.evaluate(() => Array.from(
    (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles.get("synthetic-demo.xlsx")!));
  const saved = new ExcelJS.Workbook();
  await saved.xlsx.load(Uint8Array.from(bytes) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  for (const name of ["ProjectMeta", "ProjectCalendar", "WatchReasons", "ProjectCommitments", "ProjectAudit"]) {
    expect(saved.getWorksheet(name)).toBeDefined();
  }
  expect(saved.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("Team Delivery North");
  expect(saved.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
});

test("F4c stale source refuses project Save and keeps the Calendar draft visible", async ({ page }) => {
  page.on("dialog", async dialog => { await dialog.accept(); });
  await openSharedManaged(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Edit Project Calendar" }).click();
  await settings.getByLabel("Blackout start").fill("2026-11-18");
  await page.evaluate(() => {
    const files = (window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles;
    const name = "fixture-not-project-name.xlsx";
    const original = Uint8Array.from(files.get(name)!);
    original[0] ^= 1;
    files.set(name, original);
  });
  await settings.getByRole("button", { name: "Save to shared workbook" }).click();
  await expect(settings).toContainText("changed since it was loaded", { timeout: 20_000 });
  await expect(settings.getByLabel("Blackout start")).toHaveValue("2026-11-18");
  await expect(settings).toContainText("Committed blackout: 2026-11-17 – 2026-11-19");
  const names = await page.evaluate(() =>
    [...(window as unknown as { __managedFixtureFiles: Map<string, Uint8Array> }).__managedFixtureFiles.keys()]);
  expect(names).toEqual(["fixture-not-project-name.xlsx"]);
});

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
  await expect(page.locator("#title")).toHaveText("Project name not configured");
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
  await expect(page.locator("#calendarSettings")).toBeHidden();
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
  await expect(page.locator("#calendarSettings")).toBeHidden();
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

test("Review 02 visual parity: report studio and Schedule share design language", async ({ page }, testInfo) => {
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
  expect(scheduleRadius).toBe("11px");
  const scheduleToolbar = page.locator(".managed-schedule-body .managed-gantt-scope");
  await expect(scheduleToolbar).toBeVisible();
  await testInfo.attach("review02-schedule-light", {
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
  await expect(reports.locator(".report11-mode-card")).toHaveCount(3);
  await expect(reports.locator(".report11-mode-card.active")).toContainText("Progress & Risks Update");
  await expect(reports.locator(".report11-format-choices")).toBeVisible();

  const left = await sidebar.boundingBox();
  const right = await workspace.boundingBox();
  expect(left && right).toBeTruthy();
  expect(left!.x + left!.width).toBeLessThan(right!.x);
  expect(left!.width).toBeGreaterThan(250);
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
  await testInfo.attach("review02-reports-light", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });

  await page.evaluate(() => { document.body.dataset.managedTheme = "dark"; });
  const background = await sidebar.evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(background).toBe("rgb(29, 43, 62)");
  await testInfo.attach("review02-reports-dark", {
    body: await page.screenshot({ animations: "disabled" }), contentType: "image/png",
  });
  await reports.locator("[data-report11-mode='audit']").click();
  await expect(reports.getByLabel("Report mode")).toHaveValue("audit");
  await page.locator(".managed-main-nav [data-managed-view='schedule']").click();
  await expect(chart).toBeVisible();
  await expect(reports).toBeHidden();
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
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("radio", { name: "Dark" }).check();
  await settings.getByRole("button", { name: "Close" }).click();
  await page.locator(".zoom-choice").filter({ hasText: "Day" }).click();
  await page.locator(".task-row").filter({ hasText: "Requirements sign-off" }).click();
  await expect(page.locator(".workdays-detail small")).toHaveText("Days left");
  await expect(page.locator(".workdays-detail strong")).toContainText("4 days remaining");
  await expect(page.locator(".workdays-detail strong")).not.toContainText(/workdays?/i);
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
      remaining: css(".workdays-detail").backgroundColor,
      remainingText: css(".workdays-detail strong").color,
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
    await expect(inspector.locator(".workdays-detail small")).toHaveText("Days left");
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
  await expect(page.locator("#title")).toHaveText("Project name not configured");
  await expect(page.locator(".task-row").first()).toBeVisible();
  await page.locator(".task-row").first().click();
  await expect(page.getByRole("button", { name: "Edit task" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save to workbook" })).toHaveCount(0);
  expect(messages).toEqual([]);
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
  await expect(page.locator("#title")).toHaveText("Project name not configured");
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
