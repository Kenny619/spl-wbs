import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  buildProjectDataCandidate, type ProjectEdit, type ProjectCandidateInput,
} from "../../src/managed/projectDataCandidate";
import { readManagedHistoryWithPresence } from "../../src/managed/history";
import { inspectProjectData } from "../../src/managed/projectDataInspector";
import { preflightManagedWorkbook } from "../../src/managed/preflight";
import { sha256 } from "../../src/managed/directSave";

/** F3b synthetic data only. NO production UI, disk writer, network sync or migration on import. */
const ID = {
  project: "bd95a399-257e-4b42-ac0e-fb6ee984c1aa",
  blackout: "7e4d09da-832e-4647-9202-8cbb8f8704d2",
  other: "ed58f70a-126e-4dce-ace1-b578dc5c290e",
  tx1: "c6dbf481-6868-48b7-b9b5-8726be2e2561",
  tx2: "b013abb5-a99a-4c1d-9f43-74da7dbb0fd0",
  tx3: "10ab74bf-112a-4b2e-b6d1-262a87783a98",
};
const TIME1 = "2026-11-12T02:00:00.000Z";
const TIME2 = "2026-11-12T03:00:00.000Z";
const TIME3 = "2026-11-12T04:00:00.000Z";
const blackout = { blackoutId: ID.blackout, startDate: "2026-12-18",
  endDate: "2026-12-21", label: "Office closure" };
async function legacy() {
  const b = new ExcelJS.Workbook();
  const s = b.addWorksheet("ProjectWBS");
  s.addRow(["ID", "Title", "WBSCode", "TaskType", "TaskStatus", "PlannedStart", "PlannedEnd", "Updates"]);
  s.addRow([1, "Synthetic deliverable", "1", "Task", "In Progress", "2026-11-02", "2026-12-24", "Immutable old note"]);
  b.addWorksheet("CustomerExtension").addRow(["Custom owner field", "Don't drop"]);
  return new Uint8Array(await b.xlsx.writeBuffer());
}
async function parse(bytes: Uint8Array) {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return b;
}
function args(source: Uint8Array, edit: ProjectEdit, tx = ID.tx1, time = TIME1): ProjectCandidateInput {
  return { source, edit, changeSetId: tx, timestampUTC: time,
    actorLabel: "User-entered label", appVersion: "f3b-spike" };
}
function init(source: Uint8Array, includeBlackout = true) {
  return buildProjectDataCandidate(args(source, {
    kind: "initialize", projectId: ID.project, projectName: "Tokyo & Global Launch",
    ...(includeBlackout ? { blackout } : {}),
  }));
}
async function initialized(includeBlackout = true) {
  const result = await init(await legacy(), includeBlackout);
  expect(result.kind).toBe("candidate");
  if (result.kind !== "candidate") throw new Error("Fixture initialization returned no-op");
  return result.bytes;
}
function getAudit(book: ExcelJS.Workbook) {
  const s = book.getWorksheet("ProjectAudit")!;
  return Array.from({ length: s.rowCount - 1 }, (_, i) => {
    const r = s.getRow(i + 2);
    return { tx: r.getCell(2).value, at: r.getCell(3).value,
      type: r.getCell(4).value, entity: r.getCell(5).value, taskId: r.getCell(6).value,
      action: r.getCell(7).value, field: r.getCell(8).value,
      before: r.getCell(9).value, after: r.getCell(10).value,
      provenance: r.getCell(12).value };
  });
}

describe("F3b: in-memory typed ProjectMeta/Calendar candidate and dedicated audit", () => {
  it("explicit initialization writes 5 sheets, ProjectName, one blackout and separate project audit", async () => {
    const source = await legacy();
    const unchanged = await sha256(source);
    const result = await init(source);
    expect(result.kind).toBe("candidate");
    if (result.kind !== "candidate") return;
    expect(result.auditCount).toBe(9);
    await expect(preflightManagedWorkbook(result.bytes)).resolves.toBeUndefined();
    const book = await parse(result.bytes);
    expect(inspectProjectData(book)).toMatchObject({ kind: "valid", projectName: "Tokyo & Global Launch" });
    expect(book.worksheets.map(x => x.name)).toEqual([
      "ProjectWBS", "CustomerExtension", "ProjectMeta", "ProjectCalendar",
      "WatchReasons", "ProjectCommitments", "ProjectAudit", "UpdateHistory",
    ]);
    expect(book.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("Tokyo & Global Launch");
    expect(book.getWorksheet("ProjectCalendar")!.getCell("B2").value).toBe(true);
    expect(book.getWorksheet("CustomerExtension")!.getCell("B1").value).toBe("Don't drop");
    expect(book.getWorksheet("ProjectWBS")!.getCell("H2").value).toBe("Immutable old note");
    const events = getAudit(book);
    expect(events).toHaveLength(result.auditCount);
    expect(events.every(x => x.tx === ID.tx1 && x.at === TIME1 &&
      x.taskId === null && x.provenance === "UnverifiedLocal")).toBe(true);
    expect(events.some(x => x.type === "ProjectMeta" && x.entity === "ProjectName")).toBe(true);
    expect(events.some(x => x.type === "Blackout" && x.field === "Enabled")).toBe(true);
    expect((await readManagedHistoryWithPresence(result.bytes))).toEqual({ events: [], present: true });
    expect(await sha256(source)).toBe(unchanged);
  });

  it("metadata-only first save creates headers and 3 real ProjectMeta events, no fake TaskID audit", async () => {
    const result = await init(await legacy(), false);
    expect(result.kind).toBe("candidate");
    if (result.kind !== "candidate") return;
    expect(result.auditCount).toBe(3);
    const book = await parse(result.bytes);
    expect(book.getWorksheet("ProjectCalendar")!.rowCount).toBe(1);
    expect(book.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
    expect(getAudit(book).every(x => x.type === "ProjectMeta" && x.taskId === null)).toBe(true);
  });

  it("rename preserves original ProjectID and appends only a genuine ProjectName audit", async () => {
    const before = await initialized();
    const out = await buildProjectDataCandidate(args(before, { kind: "rename",
      projectName: "東京 & International Program" }, ID.tx2, TIME2));
    expect(out.kind).toBe("candidate");
    if (out.kind !== "candidate") return;
    expect(out.auditCount).toBe(1);
    const b = await parse(out.bytes);
    expect(inspectProjectData(b)).toMatchObject({ kind: "valid",
      projectName: "東京 & International Program" });
    expect(b.getWorksheet("ProjectMeta")!.getCell("B2").value).toBe(ID.project);
    expect(b.getWorksheet("ProjectCalendar")!.getCell("C2").value).toBe("2026-12-18");
    const last = getAudit(b).at(-1);
    expect(last).toMatchObject({ type: "ProjectMeta", entity: "ProjectName",
      field: "ProjectName", action: "Update",
      before: "Tokyo & Global Launch", after: "東京 & International Program", tx: ID.tx2 });
    expect(b.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
  });

  it("same-name rename is a true no-op; source bytes and audit unchanged", async () => {
    const before = await initialized();
    const hash = await sha256(before);
    const out = await buildProjectDataCandidate(args(before,
      { kind: "rename", projectName: "Tokyo & Global Launch" }, ID.tx2, TIME2));
    expect(out).toEqual({ kind: "noop", auditCount: 0 });
    expect(await sha256(before)).toBe(hash);
    expect((await parse(before)).getWorksheet("ProjectAudit")!.rowCount).toBe(10);
  });

  it("changing existing active blackout audits changed fields and accurate old ModifiedUTC", async () => {
    const before = await initialized();
    const out = await buildProjectDataCandidate(args(before, { kind: "set-blackout",
      blackout: { ...blackout, startDate: "2026-12-17", endDate: "2026-12-23",
        label: "Extended closure" } }, ID.tx2, TIME2));
    expect(out.kind).toBe("candidate");
    if (out.kind !== "candidate") return;
    expect(out.auditCount).toBe(4);
    const b = await parse(out.bytes);
    expect(inspectProjectData(b).kind).toBe("valid");
    expect(b.getWorksheet("ProjectCalendar")!.rowCount).toBe(2);
    expect(b.getWorksheet("ProjectCalendar")!.getCell("C2").value).toBe("2026-12-17");
    expect(b.getWorksheet("ProjectCalendar")!.getCell("F2").value).toBe(TIME2);
    const lastEvents = getAudit(b).slice(-4);
    expect(lastEvents.map(x => x.field)).toEqual(["StartDate", "EndDate", "Label", "ModifiedUTC"]);
    expect(lastEvents.at(-1)).toMatchObject({ before: TIME1, after: TIME2, tx: ID.tx2 });
  });

  it("same saved blackout values are no-op and do not append ProjectAudit rows", async () => {
    const original = await initialized();
    const out = await buildProjectDataCandidate(args(original,
      { kind: "set-blackout", blackout }, ID.tx2, TIME2));
    expect(out).toEqual({ kind: "noop", auditCount: 0 });
    expect((await parse(original)).getWorksheet("ProjectAudit")!.rowCount).toBe(10);
  });

  it("disabling blackout persists disabled row and two audit fields without touching history", async () => {
    const before = await initialized();
    const out = await buildProjectDataCandidate(args(before,
      { kind: "disable-blackout", blackoutId: ID.blackout }, ID.tx2, TIME2));
    expect(out.kind).toBe("candidate");
    if (out.kind !== "candidate") return;
    expect(out.auditCount).toBe(2);
    const book = await parse(out.bytes);
    expect(book.getWorksheet("ProjectCalendar")!.getCell("B2").value).toBe(false);
    expect(book.getWorksheet("ProjectCalendar")!.rowCount).toBe(2);
    expect(book.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
    expect(getAudit(book).slice(-2).map(x => x.field)).toEqual(["Enabled", "ModifiedUTC"]);
    expect(getAudit(book).at(-2)).toMatchObject({ before: "true", after: "false", action: "Disable" });
  });

  it("allows one new blackout after prior interval is explicitly disabled, retaining its row", async () => {
    const before = await initialized();
    const disabled = await buildProjectDataCandidate(args(before, {
      kind: "disable-blackout", blackoutId: ID.blackout }, ID.tx2, TIME2));
    if (disabled.kind !== "candidate") throw new Error("Expected disabled candidate");
    const out = await buildProjectDataCandidate(args(disabled.bytes, {
      kind: "set-blackout", blackout: { ...blackout, blackoutId: ID.other,
        startDate: "2027-01-04", endDate: "2027-01-05" } }, ID.tx3, TIME3));
    expect(out.kind).toBe("candidate");
    if (out.kind !== "candidate") return;
    const book = await parse(out.bytes);
    expect(inspectProjectData(book).kind).toBe("valid");
    expect(book.getWorksheet("ProjectCalendar")!.rowCount).toBe(3);
    expect(book.getWorksheet("ProjectCalendar")!.getCell("B2").value).toBe(false);
    expect(book.getWorksheet("ProjectCalendar")!.getCell("B3").value).toBe(true);
    expect(book.getWorksheet("ProjectCalendar")!.getCell("A2").value).toBe(ID.blackout);
  });

  it("rejects introducing a second enabled blackout without modifying source bytes", async () => {
    const source = await initialized();
    const hash = await sha256(source);
    await expect(buildProjectDataCandidate(args(source, { kind: "set-blackout",
      blackout: { ...blackout, blackoutId: ID.other } }, ID.tx2, TIME2)))
      .rejects.toMatchObject({ code: "BLACKOUT_CONFLICT" });
    expect(await sha256(source)).toBe(hash);
  });

  it("rejects nonexistent blackout ID without creating a new entry", async () => {
    const source = await initialized();
    await expect(buildProjectDataCandidate(args(source,
      { kind: "disable-blackout", blackoutId: ID.other }, ID.tx2, TIME2)))
      .rejects.toMatchObject({ code: "UNKNOWN_BLACKOUT" });
  });

  it("fails closed when attempting repeated initialize, or rename on a legacy workbook", async () => {
    await expect(buildProjectDataCandidate(args(await initialized(), {
      kind: "initialize", projectId: ID.project, projectName: "Duplicate" }, ID.tx2, TIME2)))
      .rejects.toMatchObject({ code: "PROJECT_ALREADY_INITIALIZED" });
    await expect(buildProjectDataCandidate(args(await legacy(),
      { kind: "rename", projectName: "Not initialized" })))
      .rejects.toMatchObject({ code: "PROJECT_NOT_INITIALIZED" });
  });

  it("refuses invalid name, formula-like text, impossible dates and invalid actor provenance", async () => {
    const source = await legacy();
    for (const name of ["", "=HYPERLINK(1)", "x".repeat(181)]) {
      await expect(buildProjectDataCandidate(args(source,
        { kind: "initialize", projectId: ID.project, projectName: name })))
        .rejects.toMatchObject({ code: "INVALID_PROJECT_VALUE" });
    }
    await expect(buildProjectDataCandidate(args(source, { kind: "initialize",
      projectId: ID.project, projectName: "Valid", blackout: {
        ...blackout, startDate: "2026-02-30" } })))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_VALUE" });
    await expect(buildProjectDataCandidate({ ...args(source, {
      kind: "initialize", projectId: ID.project, projectName: "Valid" }),
      actorLabel: "=FALSE" })).rejects.toMatchObject({ code: "INVALID_PROJECT_VALUE" });
  });

  it("refuses existing malformed partial extension without opportunistic repair", async () => {
    const b = await parse(await legacy());
    b.addWorksheet("ProjectMeta").addRow(["Key", "Value"]);
    const source = new Uint8Array(await b.xlsx.writeBuffer());
    await expect(buildProjectDataCandidate(args(source, { kind: "initialize",
      projectId: ID.project, projectName: "Not repaired" })))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
  });

  it("refuses malformed frozen task UpdateHistory even for an otherwise legitimate project init", async () => {
    const b = await parse(await legacy());
    const history = b.addWorksheet("UpdateHistory");
    history.addRow(["ChangeSetID", "TimestampUTC", "TaskID", "WBSCode", "TaskTitle",
      "Field", "OldValue", "NewValue", "Source", "AppVersion"]);
    history.addRow([ID.tx1, TIME1, "1", "1", "Old Title", "ProjectCalendar", null, null,
      "Web UI", "f3b-spike"]);
    await expect(init(new Uint8Array(await b.xlsx.writeBuffer())))
      .rejects.toMatchObject({ code: "INVALID_HISTORY" });
  });
});
