import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildProjectDataCandidate, type ProjectEdit } from "../../src/managed/projectDataCandidate";
import { projectWatchProjection } from "../../src/managed/watchProjection";
import { inspectProjectData } from "../../src/managed/projectDataInspector";
import { saveManagedProjectDirect, captureManagedSourceHash, managedFileNames, sha256 } from "../../src/managed/directSave";

const P = "bd95a399-257e-4b42-ac0e-fb6ee984c1aa";
const R1 = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
const R2 = "ed58f70a-126e-4dce-ace1-b578dc5c290e";
const TX1 = "c6dbf481-6868-48b7-b9b5-8726be2e2561";
const TX2 = "b013abb5-a99a-4c1d-9f43-74da7dbb0fd0";
const TX3 = "10ab74bf-112a-4b2e-b6d1-262a87783a98";
const TX4 = "16f24730-9df2-425b-9a94-b54b4f24c90d";
const T1 = "2026-11-12T02:00:00.000Z";
const T2 = "2026-11-12T03:00:00.000Z";
const T3 = "2026-11-12T04:00:00.000Z";
const ACTOR = "Unverified local user";
const add = (reasonId = R1, taskId = "1"): ProjectEdit => ({
  kind: "add-watch-reason", reasonId, taskId, title: "Vendor delivery concern",
  details: "Stakeholder flagged potential delay", evidenceRef: "Meeting note",
});
const resolve = (reasonId = R1): ProjectEdit => ({
  kind: "resolve-watch-reason", reasonId, resolutionNote: "Agreed remediation delivered",
});
async function workbook(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return b;
}
async function legacy(): Promise<Uint8Array> {
  const b = new ExcelJS.Workbook();
  const wbs = b.addWorksheet("ProjectWBS");
  wbs.addRow(["ID", "Title", "WBSCode", "TaskType", "TaskStatus", "PlannedEnd", "Updates"]);
  wbs.addRow([1, "Recorded delivery", "1", "Task", "Completed", "2026-11-15", "Historical note"]);
  wbs.addRow([2, "Validation", "2", "Task", "In Progress", "2026-11-20", ""]);
  b.addWorksheet("CustomerCustom").addRow(["Client", "Never change this cell"]);
  return new Uint8Array(await b.xlsx.writeBuffer());
}
function candidate(source: Uint8Array, edit: ProjectEdit, tx = TX2, timestampUTC = T2) {
  return buildProjectDataCandidate({
    source, edit, changeSetId: tx, timestampUTC,
    actorLabel: ACTOR, appVersion: "f5c-draft",
  });
}
async function initialized() {
  const first = await candidate(await legacy(), {
    kind: "initialize", projectId: P, projectName: "Shared Project",
  }, TX1, T1);
  if (first.kind !== "candidate") throw Error("Failed synthetic initialization");
  return first.bytes;
}
async function committed(source: Uint8Array, edit: ProjectEdit, tx = TX2, time = T2) {
  const r = await candidate(source, edit, tx, time);
  expect(r.kind).toBe("candidate");
  if (r.kind !== "candidate") throw Error("Missing expected candidate");
  return r;
}
function auditFor(book: ExcelJS.Workbook, reasonId: string) {
  const s = book.getWorksheet("ProjectAudit")!;
  const rows = [];
  for (let i = 2; i <= s.rowCount; i++) {
    const r = s.getRow(i);
    if (r.getCell(5).value === reasonId) rows.push({
      id: r.getCell(1).value, tx: r.getCell(2).value,
      time: r.getCell(3).value, type: r.getCell(4).value,
      task: r.getCell(6).value, action: r.getCell(7).value,
      field: r.getCell(8).value, old: r.getCell(9).value,
      next: r.getCell(10).value, actor: r.getCell(11).value,
      provenance: r.getCell(12).value,
    });
  }
  return rows;
}

describe("F5c: audited MANUAL Watch Add/Resolve candidate (draft, no live UI)", () => {
  it("adds one recorded manual reason, preserves shared WBS/custom data and never fabricates Green", async () => {
    const source = await initialized();
    const originalHash = await sha256(source);
    const r = await committed(source, add());
    expect(r.auditCount).toBe(9);
    expect(await sha256(source)).toBe(originalHash);
    const b = await workbook(r.bytes);
    expect(inspectProjectData(b).kind).toBe("valid");
    const watch = b.getWorksheet("WatchReasons")!;
    expect(watch.getCell("A2").value).toBe(R1);
    expect(watch.getCell("B2").value).toBe("1");
    expect(watch.getCell("C2").value).toBe("Manual");
    expect(watch.getCell("D2").value).toBeNull();
    expect(watch.getCell("E2").value).toBe("Open");
    expect(watch.getCell("I2").value).toBe(T2);
    expect(watch.getCell("J2").value).toBe(ACTOR);
    expect(watch.getCell("L2").value).toBeNull();
    expect(b.getWorksheet("ProjectWBS")!.getCell("G2").value).toBe("Historical note");
    expect(b.getWorksheet("CustomerCustom")!.getCell("B1").value).toBe("Never change this cell");
    expect(b.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
    expect(b.getWorksheet("ProjectCommitments")!.rowCount).toBe(1);
    const projected = await projectWatchProjection(r.bytes);
    expect(projected.tasks[0]).toMatchObject({ disposition: "Under Watch" });
    expect(projected.tasks[0].openReasons[0]).toMatchObject({
      title: "Vendor delivery concern", hasRecordedProjectAudit: true,
    });
    expect(projected.tasks[1].disposition).toBe("Unknown");
    const audit = auditFor(b, R1);
    expect(audit).toHaveLength(9);
    expect(audit.every(x => x.action === "Create" && x.type === "WatchReason" &&
      x.task === "1" && x.tx === TX2 && x.time === T2 &&
      x.actor === ACTOR && x.provenance === "UnverifiedLocal")).toBe(true);
  });

  it("resolves a manual reason while preserving original opened fields and append-only audit", async () => {
    const opened = await committed(await initialized(), add());
    const before = await workbook(opened.bytes);
    const oldAudit = before.getWorksheet("ProjectAudit")!.rowCount;
    const r = await committed(opened.bytes, resolve(), TX3, T3);
    expect(r.auditCount).toBe(5);
    const b = await workbook(r.bytes);
    const w = b.getWorksheet("WatchReasons")!;
    expect(w.getCell("A2").value).toBe(R1);
    expect(w.getCell("E2").value).toBe("Resolved");
    expect(w.getCell("I2").value).toBe(T2);
    expect(w.getCell("J2").value).toBe(ACTOR);
    expect(w.getCell("K2").value).toBe(T3);
    expect(w.getCell("L2").value).toBe(T3);
    expect(w.getCell("M2").value).toBe(ACTOR);
    expect(w.getCell("N2").value).toBe("Agreed remediation delivered");
    expect(b.getWorksheet("ProjectAudit")!.rowCount).toBe(oldAudit + 5);
    const events = auditFor(b, R1);
    expect(events.filter(x => x.action === "Resolve")).toHaveLength(5);
    expect(events.find(x => x.field === "State" && x.action === "Resolve"))
      .toMatchObject({ old: "Open", next: "Resolved", task: "1" });
    const p = await projectWatchProjection(r.bytes);
    expect(p.tasks[0]).toMatchObject({ disposition: "Unknown" });
    expect(p.tasks[0].resolvedReasons).toHaveLength(1);
    expect(p.tasks[0].openReasons).toHaveLength(0);
  });

  it("resolving one of two independent reasons leaves the other Under Watch", async () => {
    const a = await committed(await initialized(), add());
    const b = await committed(a.bytes, add(R2), TX3, T3);
    const c = await committed(b.bytes, resolve(), TX4, "2026-11-12T05:00:00.000Z");
    const p = await projectWatchProjection(c.bytes);
    expect(p.tasks[0].disposition).toBe("Under Watch");
    expect(p.tasks[0].openReasons.map(x => x.reasonId)).toEqual([R2]);
    expect(p.tasks[0].resolvedReasons.map(x => x.reasonId)).toEqual([R1]);
  });

  it("refuses duplicate ReasonID, including case-insensitive replay", async () => {
    const r = await committed(await initialized(), add());
    await expect(candidate(r.bytes, add(R1.toUpperCase()), TX3, T3))
      .rejects.toMatchObject({ code: "DUPLICATE_WATCH_REASON" });
  });

  it("refuses attempts to resolve an already closed episode rather than rewriting history", async () => {
    const a = await committed(await initialized(), add());
    const b = await committed(a.bytes, resolve(), TX3, T3);
    await expect(candidate(b.bytes, resolve(), TX4, "2026-11-12T05:00:00.000Z"))
      .rejects.toMatchObject({ code: "WATCH_ALREADY_RESOLVED" });
  });

  it("rejects unknown TaskID and invalid reason identity before any candidate", async () => {
    const source = await initialized();
    const unchanged = await sha256(source);
    await expect(candidate(source, add(R1, "no-such-task")))
      .rejects.toMatchObject({ code: "UNKNOWN_TASK" });
    await expect(candidate(source, add("unsafe-id")))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_VALUE" });
    expect(await sha256(source)).toBe(unchanged);
  });

  it("rejects formula-like title/evidence and unsafe actor input before committing", async () => {
    const source = await initialized();
    await expect(candidate(source, { ...add(), title: "=HYPERLINK()" }))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_VALUE" });
    await expect(candidate(source, { ...add(), evidenceRef: "@unsafe" }))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_VALUE" });
    await expect(buildProjectDataCandidate({
      source, edit: add(), changeSetId: TX2, timestampUTC: T2,
      actorLabel: "=FORMULA", appVersion: "f5c",
    })).rejects.toMatchObject({ code: "INVALID_PROJECT_VALUE" });
  });

  it("rejects resolution before reason opening timestamp", async () => {
    const a = await committed(await initialized(), add());
    await expect(candidate(a.bytes, resolve(), TX3, T1))
      .rejects.toMatchObject({ code: "INVALID_TRANSACTION" });
  });

  it("rejects replayed ChangeSetID across project audit before any Watch candidate write", async () => {
    const a = await committed(await initialized(), add());
    await expect(candidate(a.bytes, resolve(), TX2, T2))
      .rejects.toMatchObject({ code: "DUPLICATE_CHANGESET" });
  });

  it("prevents manual UI from resolving recorded Automatic reasons without approved evaluator", async () => {
    const b = await workbook(await initialized());
    const w = b.getWorksheet("WatchReasons")!;
    w.addRow([R1, "1", "Automatic", "PROPOSED_UNAPPROVED_RULE", "Open",
      "Recorded rule", "Evidence unverified", "", T2, ACTOR, null, null, null, null]);
    const source = new Uint8Array(await b.xlsx.writeBuffer());
    expect(inspectProjectData(await workbook(source)).kind).toBe("valid");
    await expect(candidate(source, resolve(), TX3, T3))
      .rejects.toMatchObject({ code: "AUTO_RULE_UNAPPROVED" });
  });

  it("legacy, partial extension and future versions reject manual Watch mutation", async () => {
    await expect(candidate(await legacy(), add()))
      .rejects.toMatchObject({ code: "PROJECT_NOT_INITIALIZED" });
    const partial = await workbook(await legacy());
    partial.addWorksheet("WatchReasons").addRow(["ReasonID", "TaskID"]);
    await expect(candidate(new Uint8Array(await partial.xlsx.writeBuffer()), add()))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    const future = await workbook(await initialized());
    future.getWorksheet("ProjectMeta")!.getCell("B4").value = "9.0.0";
    await expect(candidate(new Uint8Array(await future.xlsx.writeBuffer()), add()))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
  });

  it("commits a manual Watch reason through the EXISTING verified Save and predecessor backup protocol", async () => {
    const name = "ProjectPlan.xlsx";
    const bytes = await initialized();
    const files = new Map<string, Uint8Array>([[name, bytes]]);
    const dir = {
      async getFileHandle(filename: string, options: { create?: boolean } = {}) {
        if (!files.has(filename)) {
          if (!options.create) throw Object.assign(new Error("No file"), { name: "NotFoundError" });
          files.set(filename, new Uint8Array());
        }
        return {
          async getFile() { return { async arrayBuffer() { return Uint8Array.from(files.get(filename)!).buffer; } }; },
          async createWritable() {
            let pending = new Uint8Array();
            return {
              async write(next: Uint8Array) { pending = Uint8Array.from(next); },
              async close() { files.set(filename, pending); },
            };
          },
        };
      },
      async removeEntry(filename: string) {
        if (!files.delete(filename)) throw Object.assign(new Error("No file"), { name: "NotFoundError" });
      },
    } as unknown as FileSystemDirectoryHandle;
    const loadedHash = await captureManagedSourceHash(dir, name);
    const saved = await saveManagedProjectDirect({
      directory: dir, sourceName: name, loadedHash,
      changeSetId: TX2, timestampUTC: T2,
      actorLabel: ACTOR, appVersion: "f5c",
      edit: add(),
    });
    expect(saved.kind).toBe("saved");
    if (saved.kind !== "saved") return;
    expect(saved.backupHash).toBe(loadedHash);
    expect(await sha256(files.get(managedFileNames(name).backup)!)).toBe(loadedHash);
    expect(await sha256(files.get(name)!)).toBe(saved.sourceHash);
    expect(files.has(managedFileNames(name).stage)).toBe(false);
    expect((await projectWatchProjection(files.get(name)!)).tasks[0].disposition).toBe("Under Watch");
  });
});
