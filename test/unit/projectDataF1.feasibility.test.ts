import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildManagedCandidate, HISTORY_COLUMNS } from "../../src/managed/workbookCandidate";
import { preflightManagedWorkbook } from "../../src/managed/preflight";
import { readManagedHistoryWithPresence } from "../../src/managed/history";
import { captureManagedSourceHash, managedFileNames, saveManagedDirect, sha256 } from "../../src/managed/directSave";

/**
 * F1 synthetic feasibility spike only. This suite deliberately uses the EXISTING
 * managed-preflight/task-save code and does not implement a ProjectData writer.
 *
 * Scope:
 *   - 5 proposed ordinary sheets + ProjectWBS/UpdateHistory retention
 *   - real ExcelJS serialization and real OOXML preflight
 *   - task edit backup/readback with full extended workbook intact
 *   - unsupported formula/package rejection
 *   - explicit proof of gaps NOT covered by the old package gate
 *
 * A green suite is NOT approval/implementation of ProjectData schema, Watch
 * logic, automatic sync, shared workbook locking, blackout-aware remaining days,
 * actor authentication, or corporate Edge physical UAT.
 */

const PROJECT_ID = "bd95a399-257e-4b42-ac0e-fb6ee984c1aa";
const REASON_ID = "1b61cc8b-1882-40a0-980e-6923712a5a06";
const BLACKOUT_ID = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
const COMMITMENT_ID = "d2f53d14-c4b6-470d-9769-40bb5e4cead6";
const AUDIT_ID = "fa96e28e-8456-489a-8acf-ea078a9892a4";
const CHANGE_ID = "c6dbf481-6868-48b7-b9b5-8726be2e2561";
const TIME = "2026-11-12T02:00:00.000Z";
const SOURCE = "Synthetic.xlsx";
const NEW_SHEETS = ["ProjectMeta", "ProjectCalendar", "WatchReasons", "ProjectCommitments", "ProjectAudit"] as const;

async function serialize(book: ExcelJS.Workbook) {
  return new Uint8Array(await book.xlsx.writeBuffer());
}
async function open(bytes: Uint8Array) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return book;
}

async function fixture(options: { extension?: boolean; history?: boolean; partial?: boolean } = {}) {
  const book = new ExcelJS.Workbook();
  const tasks = book.addWorksheet("ProjectWBS");
  tasks.addRow(["ID", "Title", "WBSCode", "TaskType", "Progress", "TaskStatus", "PlannedStart", "PlannedEnd", "Updates"]);
  tasks.addRow([1, "Synthetic baseline", "1", "Task", 35, "In Progress", "2026-11-02", "2026-12-24", "Original note"]);
  book.addWorksheet("Reference").addRow(["Unmodified reference", "Custom field retained"]);
  if (options.history) {
    const h = book.addWorksheet("UpdateHistory");
    h.addRow([...HISTORY_COLUMNS]);
  }
  if (options.partial) {
    book.addWorksheet("ProjectMeta").addRow(["Key", "Value"]);
  } else if (options.extension) {
    const meta = book.addWorksheet("ProjectMeta");
    meta.addRow(["Key", "Value"]);
    meta.addRow(["ProjectID", PROJECT_ID]);
    meta.addRow(["ProjectName", "JP & Global Initiative"]);
    meta.addRow(["ProjectDataSchemaVersion", "0.1.2"]);

    const cal = book.addWorksheet("ProjectCalendar");
    cal.addRow(["BlackoutID", "Enabled", "StartDate", "EndDate", "Label", "ModifiedUTC", "CustomExtension"]);
    cal.addRow([BLACKOUT_ID, true, "2026-12-18", "2026-12-21", "Project closure", TIME, "keep custom calendar cell"]);

    const watch = book.addWorksheet("WatchReasons");
    watch.addRow(["ReasonID", "TaskID", "Origin", "RuleCode", "State", "Title", "Details", "EvidenceRef", "OpenedUTC", "OpenedBy", "LastReviewedUTC", "ResolvedUTC", "ResolvedBy", "ResolutionNote"]);
    watch.addRow([REASON_ID, "1", "Manual", "", "Open", "Sponsor approval pending", "Review with stakeholder", "", TIME, "Unverified owner label", null, null, null, null]);

    const commitments = book.addWorksheet("ProjectCommitments");
    commitments.addRow(["CommitmentID", "TaskID", "AcceptedFinishDate", "AcceptedUTC", "AcceptedBy", "PreviousCommitmentID", "Rationale", "EvidenceRef"]);
    commitments.addRow([COMMITMENT_ID, "1", "2026-12-24", TIME, "Unverified owner label", null, "Approved milestone", null]);

    const audit = book.addWorksheet("ProjectAudit");
    audit.addRow(["EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID", "TaskID", "Action", "Field", "OldValue", "NewValue", "ActorLabel", "ActorProvenance", "Source", "AppVersion"]);
    audit.addRow([AUDIT_ID, CHANGE_ID, TIME, "Blackout", BLACKOUT_ID, null, "Create", "Enabled", "", "true", "Unverified owner label", "UnverifiedLocal", "Web UI", "spike-only"]);
  }
  return serialize(book);
}

class DisposableDirectory {
  readonly files = new Map<string, Uint8Array>();
  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (!this.files.has(name)) {
      if (!options.create) throw Object.assign(new Error("Missing file"), { name: "NotFoundError" });
      this.files.set(name, new Uint8Array());
    }
    const parent = this;
    return {
      async getFile() {
        return { async arrayBuffer() { return Uint8Array.from(parent.files.get(name)!).buffer; } };
      },
      async createWritable() {
        let buffer = new Uint8Array();
        return {
          async write(value: Uint8Array) { buffer = Uint8Array.from(value); },
          async close() { parent.files.set(name, buffer); },
        };
      },
    };
  }
  async removeEntry(name: string) {
    if (!this.files.delete(name)) throw Object.assign(new Error("Not found"), { name: "NotFoundError" });
  }
  asHandle(): FileSystemDirectoryHandle { return this as unknown as FileSystemDirectoryHandle; }
}

describe("F1: synthetic Excel-owned project sheets — existing implementation feasibility only", () => {
  it("existing restricted preflight accepts 5 ordinary new sheets and preserves plain-text Unicode/project metadata", async () => {
    const original = await fixture({ extension: true, history: true });
    await expect(preflightManagedWorkbook(original)).resolves.toBeUndefined();
    const result = await open(original);
    expect(result.worksheets.map((sheet) => sheet.name)).toEqual([
      "ProjectWBS", "Reference", "UpdateHistory", ...NEW_SHEETS,
    ]);
    expect(result.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("JP & Global Initiative");
    expect(result.getWorksheet("ProjectCalendar")!.getCell("G2").value).toBe("keep custom calendar cell");
    expect(result.getWorksheet("WatchReasons")!.getCell("A2").value).toBe(REASON_ID);
    expect(result.getWorksheet("ProjectCommitments")!.getCell("A2").value).toBe(COMMITMENT_ID);
    expect(result.getWorksheet("ProjectAudit")!.getCell("A2").value).toBe(AUDIT_ID);
  });

  it("a genuine existing task-only Save candidate retains all five project sheets, reference cells and task audit separately", async () => {
    const bytes = await fixture({ extension: true });
    const before = Uint8Array.from(bytes);
    const out = await buildManagedCandidate({
      source: bytes, taskId: "1", changes: { Title: "After task edit" },
      appVersion: "f1-spike", changeSetId: CHANGE_ID, timestampUTC: TIME,
    });
    expect(out.kind).toBe("candidate");
    if (out.kind !== "candidate") return;
    await expect(preflightManagedWorkbook(out.bytes)).resolves.toBeUndefined();
    const reopened = await open(out.bytes);
    expect(reopened.getWorksheet("ProjectWBS")!.getCell("B2").value).toBe("After task edit");
    expect(reopened.getWorksheet("Reference")!.getCell("B1").value).toBe("Custom field retained");
    expect(reopened.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("JP & Global Initiative");
    expect(reopened.getWorksheet("ProjectCalendar")!.getCell("G2").value).toBe("keep custom calendar cell");
    expect(reopened.getWorksheet("WatchReasons")!.getCell("A2").value).toBe(REASON_ID);
    expect(reopened.getWorksheet("ProjectCommitments")!.getCell("A2").value).toBe(COMMITMENT_ID);
    expect(reopened.getWorksheet("ProjectAudit")!.rowCount).toBe(2); // never fabricated new project audit
    const taskHistory = reopened.getWorksheet("UpdateHistory")!;
    expect(taskHistory.rowCount).toBe(2);
    expect(taskHistory.getCell("F2").value).toBe("Title");
    expect(taskHistory.getCell("C2").value).toBe("1");
    expect(bytes).toEqual(before); // original buffer untouched by in-memory candidate
  });

  it("no-op existing task edit leaves source workbook unchanged and creates no second audit", async () => {
    const bytes = await fixture({ extension: true, history: true });
    const beforeHash = await sha256(bytes);
    const out = await buildManagedCandidate({ source: bytes, taskId: "1",
      changes: { Title: "Synthetic baseline" }, appVersion: "f1-spike", changeSetId: CHANGE_ID, timestampUTC: TIME });
    expect(out.kind).toBe("noop");
    expect(await sha256(bytes)).toBe(beforeHash);
    const unchanged = await open(bytes);
    expect(unchanged.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
    expect(unchanged.getWorksheet("ProjectAudit")!.rowCount).toBe(2);
  });

  it("existing verified direct Save retains full extended workbook and predecessor backup", async () => {
    const dir = new DisposableDirectory();
    const original = await fixture({ extension: true });
    dir.files.set(SOURCE, Uint8Array.from(original));
    const loadedHash = await captureManagedSourceHash(dir.asHandle(), SOURCE);
    const out = await saveManagedDirect({ directory: dir.asHandle(), sourceName: SOURCE,
      loadedHash, taskId: "1", changes: { Title: "Verified synthetic Save" },
      appVersion: "f1-spike", changeSetId: CHANGE_ID, timestampUTC: TIME });
    expect(out.kind).toBe("saved");
    if (out.kind !== "saved") return;
    expect(await sha256(dir.files.get(managedFileNames(SOURCE).backup)!)).toBe(loadedHash);
    expect((await open(dir.files.get(SOURCE)!)).getWorksheet("ProjectMeta")!.getCell("B3").value)
      .toBe("JP & Global Initiative");
    expect((await open(dir.files.get(SOURCE)!)).getWorksheet("ProjectAudit")!.rowCount).toBe(2);
    expect(dir.files.has(managedFileNames(SOURCE).stage)).toBe(false);
    expect(dir.files.has(managedFileNames(SOURCE).transaction)).toBe(false);
  });

  it("a stale source prevents any staging or side effects in a disposable directory", async () => {
    const dir = new DisposableDirectory();
    dir.files.set(SOURCE, await fixture({ extension: true }));
    const originalHash = await captureManagedSourceHash(dir.asHandle(), SOURCE);
    const editedExternally = await open(dir.files.get(SOURCE)!);
    editedExternally.getWorksheet("ProjectMeta")!.getCell("B3").value = "Other user's saved name";
    dir.files.set(SOURCE, await serialize(editedExternally));
    const changedHash = await sha256(dir.files.get(SOURCE)!);
    await expect(saveManagedDirect({ directory: dir.asHandle(), sourceName: SOURCE,
      loadedHash: originalHash, taskId: "1", changes: { Title: "Must not overwrite" },
      appVersion: "f1-spike", changeSetId: CHANGE_ID, timestampUTC: TIME }))
      .rejects.toMatchObject({ code: "STALE_SOURCE" });
    expect(await sha256(dir.files.get(SOURCE)!)).toBe(changedHash);
    expect(dir.files.has(managedFileNames(SOURCE).stage)).toBe(false);
  });

  it("rejects formula-bearing newly introduced project sheets instead of weakening OOXML safety", async () => {
    const b = await open(await fixture({ extension: true }));
    b.getWorksheet("ProjectMeta")!.getCell("B5").value = { formula: "1+1", result: 2 };
    await expect(preflightManagedWorkbook(await serialize(b)))
      .rejects.toMatchObject({ code: "UNSUPPORTED_SHEET_FEATURE" });
  });

  it("rejects an unsupported customXml package part in an otherwise acceptable 5-sheet workbook", async () => {
    const zip = await JSZip.loadAsync(await fixture({ extension: true }));
    zip.file("customXml/item1.xml", "<unsupported>do not silently drop</unsupported>");
    await expect(preflightManagedWorkbook(await zip.generateAsync({ type: "uint8array" })))
      .rejects.toMatchObject({ code: "UNSUPPORTED_PACKAGE" });
  });

  it("legacy workbook without the new sheets remains acceptable to existing package preflight", async () => {
    const bytes = await fixture();
    await expect(preflightManagedWorkbook(bytes)).resolves.toBeUndefined();
    expect((await open(bytes)).getWorksheet("ProjectMeta")).toBeUndefined();
  });

  it("DIAGNOSTIC GAP: current package-only preflight does not reject a partial new domain schema", async () => {
    // This is NOT a requirement PASS. It proves a separate new domain validator
    // is mandatory before any project-data write is enabled.
    const bytes = await fixture({ partial: true });
    await expect(preflightManagedWorkbook(bytes)).resolves.toBeUndefined();
    const book = await open(bytes);
    expect(book.getWorksheet("ProjectMeta")).toBeDefined();
    expect(book.getWorksheet("ProjectCalendar")).toBeUndefined();
  });

  it("frozen task UpdateHistory reader cannot be reused for project-calendar audit events", async () => {
    const b = await open(await fixture({ extension: true, history: true }));
    const history = b.getWorksheet("UpdateHistory")!;
    history.addRow([CHANGE_ID, TIME, "", "", "", "ProjectCalendar", "", "", "Web UI", "f1-spike"]);
    await expect(readManagedHistoryWithPresence(await serialize(b)))
      .rejects.toMatchObject({ code: "INVALID_HISTORY" });
  });
});
