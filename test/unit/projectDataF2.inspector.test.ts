import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { inspectProjectData, PROJECT_DATA_SHEETS } from "../../src/managed/projectDataInspector";
import { preflightManagedWorkbook } from "../../src/managed/preflight";

const IDs = {
  project: "bd95a399-257e-4b42-ac0e-fb6ee984c1aa",
  blackout: "7e4d09da-832e-4647-9202-8cbb8f8704d2",
  watch: "1b61cc8b-1882-40a0-980e-6923712a5a06",
  commitment: "d2f53d14-c4b6-470d-9769-40bb5e4cead6",
  event: "fa96e28e-8456-489a-8acf-ea078a9892a4",
  change: "c6dbf481-6868-48b7-b9b5-8726be2e2561",
};
const NOW = "2026-11-12T02:00:00.000Z";
function base(): ExcelJS.Workbook {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("ProjectWBS");
  sheet.addRow(["ID", "Title", "WBSCode", "TaskType"]);
  sheet.addRow([1, "Synthetic Task", "1", "Task"]);
  return book;
}
function complete(): ExcelJS.Workbook {
  const book = base();
  const meta = book.addWorksheet("ProjectMeta");
  meta.addRow(["Key", "Value"]);
  meta.addRow(["ProjectID", IDs.project]);
  meta.addRow(["ProjectName", "Tokyo & Global Launch"]);
  meta.addRow(["ProjectDataSchemaVersion", "0.1.2"]);
  const cal = book.addWorksheet("ProjectCalendar");
  cal.addRow(["BlackoutID", "Enabled", "StartDate", "EndDate", "Label", "ModifiedUTC"]);
  cal.addRow([IDs.blackout, true, "2026-12-18", "2026-12-21", "Project closure", NOW]);
  const watch = book.addWorksheet("WatchReasons");
  watch.addRow(["ReasonID", "TaskID", "Origin", "RuleCode", "State", "Title", "Details", "EvidenceRef",
    "OpenedUTC", "OpenedBy", "LastReviewedUTC", "ResolvedUTC", "ResolvedBy", "ResolutionNote"]);
  watch.addRow([IDs.watch, "1", "Manual", null, "Open", "Review pending", "Details", null,
    NOW, "Local actor", null, null, null, null]);
  const commitments = book.addWorksheet("ProjectCommitments");
  commitments.addRow(["CommitmentID", "TaskID", "AcceptedFinishDate", "AcceptedUTC", "AcceptedBy",
    "PreviousCommitmentID", "Rationale", "EvidenceRef"]);
  commitments.addRow([IDs.commitment, "1", "2026-12-24", NOW, "Local actor", null, "Approved", null]);
  const audit = book.addWorksheet("ProjectAudit");
  audit.addRow(["EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID", "TaskID",
    "Action", "Field", "OldValue", "NewValue", "ActorLabel", "ActorProvenance", "Source", "AppVersion"]);
  audit.addRow([IDs.event, IDs.change, NOW, "Blackout", IDs.blackout, null, "Create", "Enabled",
    null, "true", "Local actor", "UnverifiedLocal", "Web UI", "f2-spike"]);
  return book;
}
function errors(book: ExcelJS.Workbook) {
  const result = inspectProjectData(book);
  if (result.kind === "incompatible" || result.kind === "unsupported_future") {
    return result.findings.map(v => v.code);
  }
  return [];
}
function cell(book: ExcelJS.Workbook, sheet: string, address: string, value: ExcelJS.CellValue) {
  book.getWorksheet(sheet)!.getCell(address).value = value;
  return book;
}

describe("F2 READ-ONLY ProjectData schema inspection (not yet wired into Save)", () => {
  it("recognizes untouched v1 workbook as legacy and does not create project sheets", () => {
    const book = base();
    expect(inspectProjectData(book)).toEqual({ kind: "legacy", projectName: null, findings: [] });
    expect(book.worksheets.map(v => v.name)).toEqual(["ProjectWBS"]);
  });

  it("recognizes all five proposed sheets with real cross-sheet TaskID and audit links", () => {
    const book = complete();
    expect(inspectProjectData(book)).toEqual({
      kind: "valid", projectName: "Tokyo & Global Launch", schemaVersion: "0.1.2", findings: [],
    });
    expect(book.worksheets.filter(v => PROJECT_DATA_SHEETS.includes(v.name as typeof PROJECT_DATA_SHEETS[number]))).toHaveLength(5);
  });

  it("a valid extended synthetic workbook still passes the existing package safety gate", async () => {
    const book = complete();
    const bytes = new Uint8Array(await book.xlsx.writeBuffer());
    await expect(preflightManagedWorkbook(bytes)).resolves.toBeUndefined();
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    expect(inspectProjectData(reloaded).kind).toBe("valid");
  });

  it("partial project extension is incompatible despite valid OOXML package layout", async () => {
    const book = base();
    book.addWorksheet("ProjectMeta").addRow(["Key", "Value"]);
    expect(errors(book)).toContain("MISSING_SHEET");
    await expect(preflightManagedWorkbook(new Uint8Array(await book.xlsx.writeBuffer())))
      .resolves.toBeUndefined();
  });

  it("future schema version is explicitly unsupported; old version does not silently migrate", () => {
    expect(inspectProjectData(cell(complete(), "ProjectMeta", "B4", "9.0.0")).kind).toBe("unsupported_future");
    expect(errors(cell(complete(), "ProjectMeta", "B4", "0.1.1"))).toContain("BAD_SCHEMA_VERSION");
  });

  it("required project name is not inferred from filename and refuses blank/formula values", () => {
    expect(errors(cell(complete(), "ProjectMeta", "B3", " "))).toContain("BAD_PROJECT_NAME");
    expect(errors(cell(complete(), "ProjectMeta", "B3", { formula: "1+1", result: 2 }))).toContain("BAD_TEXT");
  });

  it("requires a unique valid ProjectID and one ProjectName", () => {
    expect(errors(cell(complete(), "ProjectMeta", "B2", "not a UUID"))).toContain("BAD_PROJECT_ID");
    const book = complete();
    book.getWorksheet("ProjectMeta")!.addRow(["ProjectName", "Conflicting"]);
    expect(errors(book)).toContain("DUPLICATE_META");
  });

  it("rejects duplicate required headers while retaining compatible custom sheet columns", () => {
    const broken = complete();
    broken.getWorksheet("ProjectCalendar")!.getCell("G1").value = "enabled";
    expect(errors(broken)).toContain("DUPLICATE_HEADER");
    const extra = complete();
    extra.getWorksheet("ProjectCalendar")!.getCell("G1").value = "CustomNote";
    extra.getWorksheet("ProjectCalendar")!.getCell("G2").value = "keep me";
    expect(inspectProjectData(extra).kind).toBe("valid");
    expect(extra.getWorksheet("ProjectCalendar")!.getCell("G2").value).toBe("keep me");
  });

  it("rejects invalid range, invalid Excel Enabled text, and two active blackouts", () => {
    expect(errors(cell(complete(), "ProjectCalendar", "D2", "2026-12-17"))).toContain("REVERSED_RANGE");
    expect(errors(cell(complete(), "ProjectCalendar", "B2", "true"))).toContain("BAD_ENABLED");
    const two = complete();
    two.getWorksheet("ProjectCalendar")!.addRow([
      "ed58f70a-126e-4dce-ace1-b578dc5c290e", true, "2026-12-28", "2026-12-30", "", NOW,
    ]);
    expect(errors(two)).toContain("MULTIPLE_ACTIVE_BLACKOUT");
  });

  it("rejects impossible ISO date, missing UTC time, duplicate blackout ID", () => {
    expect(errors(cell(complete(), "ProjectCalendar", "C2", "2026-02-30"))).toContain("BAD_DATE");
    expect(errors(cell(complete(), "ProjectCalendar", "F2", "2026-11-12"))).toContain("BAD_UTC");
    const duplicate = complete();
    duplicate.getWorksheet("ProjectCalendar")!.addRow([
      IDs.blackout, false, "2027-01-04", "2027-01-05", null, NOW,
    ]);
    expect(errors(duplicate)).toContain("DUPLICATE_ID");
  });

  it("Watch references TaskID not WBS code; unresolved task and invalid origin are blocked", () => {
    expect(errors(cell(complete(), "WatchReasons", "B2", "no such task"))).toContain("UNKNOWN_TASK");
    expect(errors(cell(complete(), "WatchReasons", "C2", "Unknown"))).toContain("BAD_ORIGIN");
  });

  it("a resolved Watch requires UTC timestamp and actor, while open reason cannot claim resolved state", () => {
    expect(errors(cell(complete(), "WatchReasons", "E2", "Resolved"))).toContain("MISSING_RESOLUTION");
    expect(errors(cell(complete(), "WatchReasons", "L2", NOW))).toContain("OPEN_HAS_RESOLUTION");
    const completeResolution = complete();
    completeResolution.getWorksheet("WatchReasons")!.getCell("E2").value = "Resolved";
    completeResolution.getWorksheet("WatchReasons")!.getCell("L2").value = NOW;
    completeResolution.getWorksheet("WatchReasons")!.getCell("M2").value = "Local actor";
    expect(inspectProjectData(completeResolution).kind).toBe("valid");
  });

  it("commitment predecessor must reference another same-task commitment and avoid a cycle", () => {
    expect(errors(cell(complete(), "ProjectCommitments", "F2", IDs.commitment))).toContain("COMMITMENT_CYCLE");
    expect(errors(cell(complete(), "ProjectCommitments", "F2", IDs.blackout))).toContain("UNKNOWN_PRIOR");
  });

  it("separate ProjectAudit rejects fake TaskID, missing entity, or unknown action", () => {
    expect(errors(cell(complete(), "ProjectAudit", "F2", "1"))).toContain("FAKE_PROJECT_TASK");
    expect(errors(cell(complete(), "ProjectAudit", "E2", "not linked"))).toContain("UNKNOWN_AUDIT_ENTITY");
    expect(errors(cell(complete(), "ProjectAudit", "G2", "Green"))).toContain("BAD_AUDIT_ACTION");
  });

  it("proposed audit insists on actor-provenance honesty and one UTC timestamp per Save ID", () => {
    expect(errors(cell(complete(), "ProjectAudit", "L2", "CorporateVerified"))).toContain("BAD_PROVENANCE");
    const book = complete();
    book.getWorksheet("ProjectAudit")!.addRow([
      "1a73187f-ab2f-4ec0-9ffd-d86fcae892d6", IDs.change,
      "2026-11-12T03:00:00.000Z", "Blackout", IDs.blackout, null, "Update",
      "Label", "old", "new", "Local actor", "UnverifiedLocal", "Web UI", "f2-spike",
    ]);
    expect(errors(book)).toContain("CHANGESET_TIME");
  });

  it("rejects WatchReason ProjectAudit rows attributed to a different existing TaskID", () => {
    const b = complete();
    b.getWorksheet("ProjectWBS")!.addRow([2, "Another Task", "2", "Task"]);
    const audit = b.getWorksheet("ProjectAudit")!;
    audit.getCell("D2").value = "WatchReason";
    audit.getCell("E2").value = IDs.watch;
    audit.getCell("F2").value = "2";
    expect(errors(b)).toContain("AUDIT_TASK_MISMATCH");
  });

  it("rejects Commitment ProjectAudit rows attributed to a different existing TaskID", () => {
    const b = complete();
    b.getWorksheet("ProjectWBS")!.addRow([2, "Another Task", "2", "Task"]);
    const audit = b.getWorksheet("ProjectAudit")!;
    audit.getCell("D2").value = "Commitment";
    audit.getCell("E2").value = IDs.commitment;
    audit.getCell("F2").value = "2";
    expect(errors(b)).toContain("AUDIT_TASK_MISMATCH");
  });

  it("rejects ProjectMeta audit references to non-existent metadata keys", () => {
    const b = complete();
    const audit = b.getWorksheet("ProjectAudit")!;
    audit.getCell("D2").value = "ProjectMeta";
    audit.getCell("E2").value = "InventedProjectField";
    audit.getCell("H2").value = "ProjectName";
    expect(errors(b)).toContain("UNKNOWN_AUDIT_ENTITY");
  });

  it("all invalid inspections are read-only and leave worksheet names/row values unchanged", () => {
    const book = complete();
    const before = book.worksheets.map(s => [s.name, s.rowCount]);
    book.getWorksheet("ProjectCalendar")!.getCell("B2").value = "bad";
    const result = inspectProjectData(book);
    expect(result.kind).toBe("incompatible");
    expect(book.worksheets.map(s => [s.name, s.rowCount])).toEqual(before);
    expect(book.getWorksheet("ProjectCalendar")!.getCell("B2").value).toBe("bad");
  });
});
