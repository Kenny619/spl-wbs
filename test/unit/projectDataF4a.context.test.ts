import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildProjectDataCandidate } from "../../src/managed/projectDataCandidate";
import { bundledHolidayCalendar } from "../../src/calendar/jpHolidays";
import { remainingWorkdays } from "../../src/calendar/workdays";
import { sha256 } from "../../src/managed/directSave";
import {
  projectBrowserTitle, readProjectContext, remainingProjectDays, sharedProjectDisplayName,
} from "../../src/managed/projectContext";

const PROJECT = "bd95a399-257e-4b42-ac0e-fb6ee984c1aa";
const BLACKOUT = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
const TX = "c6dbf481-6868-48b7-b9b5-8726be2e2561";
const TIME = "2026-11-12T02:00:00.000Z";
const holidays = bundledHolidayCalendar();

async function legacy(): Promise<Uint8Array> {
  const b = new ExcelJS.Workbook();
  const wbs = b.addWorksheet("ProjectWBS");
  wbs.addRow(["ID", "Title", "WBSCode", "TaskType", "PlannedEnd"]);
  wbs.addRow([1, "Milestone", "1", "Task", "2026-12-23"]);
  return new Uint8Array(await b.xlsx.writeBuffer());
}
async function existing({
  projectName = "Tokyo & International", blackout = true,
}: { projectName?: string; blackout?: boolean } = {}) {
  const source = await legacy();
  const c = await buildProjectDataCandidate({
    source, changeSetId: TX, timestampUTC: TIME, appVersion: "f4a-spike",
    actorLabel: "Unverified local actor",
    edit: { kind: "initialize", projectId: PROJECT, projectName,
      ...(blackout ? { blackout: {
        blackoutId: BLACKOUT, startDate: "2026-12-18",
        endDate: "2026-12-21", label: "Shared closure",
      } } : {}) },
  });
  if (c.kind !== "candidate") throw new Error("Project context fixture did not initialize");
  return c.bytes;
}
async function loaded(bytes: Uint8Array) {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return b;
}
describe("F4a: workbook-committed project identity and blackout as read-only context", () => {
  it("reads shared ProjectName from committed Excel, never from workbook filename", async () => {
    const bytes = await existing();
    const hash = await sha256(bytes);
    const ctx = await readProjectContext(bytes);
    expect(ctx.kind).toBe("valid");
    expect(sharedProjectDisplayName(ctx)).toBe("Tokyo & International");
    expect(projectBrowserTitle(ctx)).toBe("Tokyo & International — SPT-WBS");
    expect(await sha256(bytes)).toBe(hash);
  });

  it("valid workbook with configured empty blackout is different from legacy unconfigured", async () => {
    const empty = await readProjectContext(await existing({ blackout: false }));
    expect(empty).toMatchObject({ kind: "valid", projectCalendarConfigured: true,
      blackout: { enabled: false, start: "", end: "" } });
    const old = await readProjectContext(await legacy());
    expect(old).toEqual({
      kind: "legacy", projectName: null, blackout: null,
      projectCalendarConfigured: false, findings: [],
    });
    expect(sharedProjectDisplayName(old)).toBe("Project name not configured");
    expect(projectBrowserTitle(old)).not.toContain("ProjectPlan.xlsx");
  });

  it("reads the one committed inclusive blackout and does not need local browser storage", async () => {
    const ctx = await readProjectContext(await existing());
    expect(ctx).toMatchObject({
      kind: "valid", projectCalendarConfigured: true,
      blackout: { enabled: true, start: "2026-12-18", end: "2026-12-21" },
    });
  });

  it("a partial extension is incompatible, never treated as an empty saved calendar", async () => {
    const b = await loaded(await legacy());
    b.addWorksheet("ProjectMeta").addRow(["Key", "Value"]);
    const ctx = await readProjectContext(new Uint8Array(await b.xlsx.writeBuffer()));
    expect(ctx.kind).toBe("incompatible");
    expect(ctx.blackout).toBeNull();
    expect(sharedProjectDisplayName(ctx)).toBe("Project data unavailable");
    expect(remainingProjectDays("2026-12-23", "2026-12-17",
      "In Progress", holidays, ctx)).toEqual({ kind: "unknown" });
  });

  it("future schema is not downgraded to assumed empty blackout or local identity", async () => {
    const b = await loaded(await existing());
    b.getWorksheet("ProjectMeta")!.getCell("B4").value = "9.0.0";
    const ctx = await readProjectContext(new Uint8Array(await b.xlsx.writeBuffer()));
    expect(ctx.kind).toBe("unsupported_future");
    expect(ctx.blackout).toBeNull();
    expect(remainingProjectDays("2026-12-23", "2026-12-17",
      "In Progress", holidays, ctx)).toEqual({ kind: "unknown" });
  });

  it("excludes project blackout weekdays once while preserving weekend overlap", async () => {
    const ctx = await readProjectContext(await existing());
    const baseline = remainingWorkdays("2026-12-23", "2026-12-17", "In Progress", holidays);
    expect(baseline).toEqual({ kind: "count", days: 4 });
    expect(remainingProjectDays("2026-12-23", "2026-12-17",
      "In Progress", holidays, ctx)).toEqual({ kind: "count", days: 2 });
  });

  it("blackout overlapping Japanese holiday and weekend excludes each date only once", async () => {
    const b = await loaded(await existing());
    const row = b.getWorksheet("ProjectCalendar")!.getRow(2);
    row.getCell(3).value = "2026-11-21";
    row.getCell(4).value = "2026-11-24";
    const ctx = await readProjectContext(new Uint8Array(await b.xlsx.writeBuffer()));
    expect(remainingProjectDays("2026-11-25", "2026-11-20",
      "In Progress", holidays, ctx)).toEqual({ kind: "count", days: 1 });
    expect(remainingWorkdays("2026-11-25", "2026-11-20",
      "In Progress", holidays)).toEqual({ kind: "count", days: 2 });
  });

  it("legacy workbook preserves frozen v18 arithmetic but flags calendar unconfigured", async () => {
    const old = await readProjectContext(await legacy());
    expect(old.projectCalendarConfigured).toBe(false);
    expect(remainingProjectDays("2026-12-23", "2026-12-17",
      "In Progress", holidays, old)).toEqual(
      remainingWorkdays("2026-12-23", "2026-12-17", "In Progress", holidays),
    );
  });

  it("inactive status, today, overdue and incomplete holiday coverage retain semantics", async () => {
    const ctx = await readProjectContext(await existing());
    expect(remainingProjectDays("2026-12-24", "2026-12-17",
      "Completed", holidays, ctx)).toEqual({ kind: "hidden" });
    expect(remainingProjectDays("2026-12-17", "2026-12-17",
      "In Progress", holidays, ctx)).toEqual({ kind: "today" });
    expect(remainingProjectDays("2026-12-16", "2026-12-17",
      "In Progress", holidays, ctx)).toEqual({ kind: "overdue" });
    expect(remainingProjectDays("2031-01-05", "2030-12-31",
      "In Progress", holidays, ctx)).toEqual({ kind: "unknown" });
  });

  it("read-only project context does not mutate workbook or fabricate any audit row", async () => {
    const bytes = await existing();
    const hash = await sha256(bytes);
    const before = await loaded(bytes);
    const rowCount = before.getWorksheet("ProjectAudit")!.rowCount;
    await readProjectContext(bytes);
    await readProjectContext(bytes);
    expect(await sha256(bytes)).toBe(hash);
    const after = await loaded(bytes);
    expect(after.getWorksheet("ProjectAudit")!.rowCount).toBe(rowCount);
  });
});
