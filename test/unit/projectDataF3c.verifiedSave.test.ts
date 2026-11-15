import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  captureManagedSourceHash, inspectManagedSave, managedFileNames,
  saveManagedProjectDirect, saveManagedDirect, sha256,
} from "../../src/managed/directSave";
import type { ProjectEdit } from "../../src/managed/projectDataCandidate";
import { inspectProjectData } from "../../src/managed/projectDataInspector";

const NAME = "ProjectPlan.xlsx";
const PID = "bd95a399-257e-4b42-ac0e-fb6ee984c1aa";
const BID = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
const ID1 = "c6dbf481-6868-48b7-b9b5-8726be2e2561";
const ID2 = "b013abb5-a99a-4c1d-9f43-74da7dbb0fd0";
const ID3 = "10ab74bf-112a-4b2e-b6d1-262a87783a98";
const T1 = "2026-11-12T02:00:00.000Z";
const T2 = "2026-11-12T03:00:00.000Z";
const T3 = "2026-11-12T04:00:00.000Z";
const BLACKOUT = { blackoutId: BID, startDate: "2026-12-18",
  endDate: "2026-12-21", label: "Project closure" };
const INITIAL: ProjectEdit = { kind: "initialize", projectId: PID,
  projectName: "Shared Tokyo Program", blackout: BLACKOUT };
const RENAME: ProjectEdit = { kind: "rename", projectName: "Updated Shared Program" };

async function syntheticLegacy(): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  const tasks = book.addWorksheet("ProjectWBS");
  tasks.addRow(["ID", "Title", "WBSCode", "TaskType", "TaskStatus", "PlannedStart", "PlannedEnd"]);
  tasks.addRow([1, "Delivery milestone", "1", "Task", "In Progress", "2026-11-02", "2026-12-24"]);
  book.addWorksheet("Reference").addRow(["Custom", "Keep original cell"]);
  return new Uint8Array(await book.xlsx.writeBuffer());
}
async function book(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return b;
}
class SyntheticDirectory {
  readonly files = new Map<string, Uint8Array>();
  failAfterClose: string | null = null;
  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (!this.files.has(name)) {
      if (!options.create) throw Object.assign(new Error("No file: " + name), { name: "NotFoundError" });
      this.files.set(name, new Uint8Array());
    }
    const that = this;
    return {
      async getFile() { return { async arrayBuffer() { return Uint8Array.from(that.files.get(name)!).buffer; } }; },
      async createWritable() {
        let bytes = new Uint8Array();
        return {
          async write(next: Uint8Array) { bytes = Uint8Array.from(next); },
          async close() {
            that.files.set(name, bytes);
            if (that.failAfterClose === name) {
              throw Object.assign(new Error("Simulated file-close interruption"), { name: "NotAllowedError" });
            }
          },
        };
      },
    };
  }
  async removeEntry(name: string) {
    if (!this.files.delete(name)) throw Object.assign(new Error("Not found"), { name: "NotFoundError" });
  }
  handle(): FileSystemDirectoryHandle { return this as unknown as FileSystemDirectoryHandle; }
}
async function fixture() {
  const dir = new SyntheticDirectory();
  dir.files.set(NAME, await syntheticLegacy());
  return dir;
}
async function run(
  dir: SyntheticDirectory, hash: string, edit: ProjectEdit,
  changeSetId = ID1, timestampUTC = T1,
) {
  return saveManagedProjectDirect({
    directory: dir.handle(), sourceName: NAME, loadedHash: hash,
    edit, changeSetId, timestampUTC, actorLabel: "Unverified editor",
    appVersion: "f3c-test",
  });
}
async function initialized() {
  const dir = await fixture();
  const hash = await captureManagedSourceHash(dir.handle(), NAME);
  const first = await run(dir, hash, INITIAL);
  expect(first.kind).toBe("saved");
  if (first.kind !== "saved") throw new Error("Initial project Save did not commit");
  return { dir, first, originalHash: hash };
}

describe("F3c: project candidate through shared verified direct Save protocol (synthetic only)", () => {
  it("first verified project Save creates 5 ordinary sheets and separate audit with predecessor backup", async () => {
    const dir = await fixture();
    const before = Uint8Array.from(dir.files.get(NAME)!);
    const initialHash = await captureManagedSourceHash(dir.handle(), NAME);
    const saved = await run(dir, initialHash, INITIAL);
    expect(saved.kind).toBe("saved");
    if (saved.kind !== "saved") return;
    const filenames = managedFileNames(NAME);
    expect(saved.backupHash).toBe(initialHash);
    expect(await sha256(dir.files.get(filenames.backup)!)).toBe(initialHash);
    expect(dir.files.get(filenames.backup)).toEqual(before);
    expect(dir.files.has(filenames.stage)).toBe(false);
    expect(dir.files.has(filenames.transaction)).toBe(false);
    expect((await inspectManagedSave(dir.handle(), NAME)).status).toBe("READY");
    const committed = await book(dir.files.get(NAME)!);
    expect(inspectProjectData(committed)).toMatchObject({
      kind: "valid", projectName: "Shared Tokyo Program",
    });
    expect(committed.getWorksheet("ProjectWBS")!.getCell("B2").value).toBe("Delivery milestone");
    expect(committed.getWorksheet("Reference")!.getCell("B1").value).toBe("Keep original cell");
    expect(committed.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
    expect(committed.getWorksheet("ProjectAudit")!.rowCount).toBe(10);
    expect(committed.getWorksheet("ProjectCalendar")!.getCell("B2").value).toBe(true);
    expect(saved.sourceHash).toBe(await sha256(dir.files.get(NAME)!));
  });

  it("second verified project rename rotates predecessor backup without touching task Change History", async () => {
    const { dir, first } = await initialized();
    const predecessor = Uint8Array.from(dir.files.get(NAME)!);
    const second = await run(dir, first.sourceHash, RENAME, ID2, T2);
    expect(second.kind).toBe("saved");
    if (second.kind !== "saved") return;
    const backup = managedFileNames(NAME).backup;
    expect(dir.files.get(backup)).toEqual(predecessor);
    expect(second.backupHash).toBe(first.sourceHash);
    const committed = await book(dir.files.get(NAME)!);
    expect(committed.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("Updated Shared Program");
    expect(committed.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
    expect(committed.getWorksheet("ProjectAudit")!.rowCount).toBe(11);
    const auditRow = committed.getWorksheet("ProjectAudit")!.getRow(11);
    expect(auditRow.getCell(2).value).toBe(ID2);
    expect(auditRow.getCell(8).value).toBe("ProjectName");
    expect(auditRow.getCell(9).value).toBe("Shared Tokyo Program");
    expect(auditRow.getCell(10).value).toBe("Updated Shared Program");
  });

  it("project Save no-op creates no new backup rotation, audit or stage", async () => {
    const { dir, first } = await initialized();
    const before = Uint8Array.from(dir.files.get(NAME)!);
    const backupBefore = Uint8Array.from(dir.files.get(managedFileNames(NAME).backup)!);
    const saved = await run(dir, first.sourceHash, {
      kind: "rename", projectName: "Shared Tokyo Program",
    }, ID2, T2);
    expect(saved).toEqual({ kind: "noop", sourceHash: first.sourceHash });
    expect(dir.files.get(NAME)).toEqual(before);
    expect(dir.files.get(managedFileNames(NAME).backup)).toEqual(backupBefore);
    expect(dir.files.has(managedFileNames(NAME).stage)).toBe(false);
    expect((await book(dir.files.get(NAME)!)).getWorksheet("ProjectAudit")!.rowCount).toBe(10);
  });

  it("persisted blackout update and disable are sequential safe project Saves", async () => {
    const { dir, first } = await initialized();
    const update = await run(dir, first.sourceHash, {
      kind: "set-blackout",
      blackout: { ...BLACKOUT, endDate: "2026-12-23", label: "Extended closure" },
    }, ID2, T2);
    expect(update.kind).toBe("saved");
    if (update.kind !== "saved") return;
    const disable = await run(dir, update.sourceHash,
      { kind: "disable-blackout", blackoutId: BID }, ID3, T3);
    expect(disable.kind).toBe("saved");
    const committed = await book(dir.files.get(NAME)!);
    expect(inspectProjectData(committed).kind).toBe("valid");
    expect(committed.getWorksheet("ProjectCalendar")!.getCell("D2").value).toBe("2026-12-23");
    expect(committed.getWorksheet("ProjectCalendar")!.getCell("B2").value).toBe(false);
    expect(committed.getWorksheet("ProjectCalendar")!.rowCount).toBe(2);
    expect(committed.getWorksheet("UpdateHistory")!.rowCount).toBe(1);
    expect((await inspectManagedSave(dir.handle(), NAME)).status).toBe("READY");
  });

  it("stale loaded workbook blocks project writes before staging or any overwrite", async () => {
    const { dir, originalHash } = await initialized();
    const current = Uint8Array.from(dir.files.get(NAME)!);
    const currentHash = await sha256(current);
    await expect(run(dir, originalHash, RENAME, ID2, T2))
      .rejects.toMatchObject({ code: "STALE_SOURCE" });
    expect(await sha256(dir.files.get(NAME)!)).toBe(currentHash);
    expect(dir.files.has(managedFileNames(NAME).stage)).toBe(false);
    expect(dir.files.has(managedFileNames(NAME).transaction)).toBe(false);
  });

  it("partial project extension refuses existing Save with no new sidecars", async () => {
    const dir = await fixture();
    const workbook = await book(dir.files.get(NAME)!);
    workbook.addWorksheet("ProjectMeta").addRow(["Key", "Value"]);
    dir.files.set(NAME, new Uint8Array(await workbook.xlsx.writeBuffer()));
    const bytes = Uint8Array.from(dir.files.get(NAME)!);
    await expect(run(dir, await sha256(bytes), INITIAL))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    expect(dir.files.get(NAME)).toEqual(bytes);
    expect(dir.files.size).toBe(1);
  });

  it("invalid project name fails before stage/source/backup mutation", async () => {
    const dir = await fixture();
    const original = Uint8Array.from(dir.files.get(NAME)!);
    await expect(run(dir, await sha256(original), { ...INITIAL, projectName: "=1+1" }))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_VALUE" });
    expect(dir.files.get(NAME)).toEqual(original);
    expect(dir.files.size).toBe(1);
  });

  it("refuses a second logical project Save reusing an already committed ChangeSetID", async () => {
    const { dir, first } = await initialized();
    const bytes = Uint8Array.from(dir.files.get(NAME)!);
    // Distinct Save operations must never share one transaction identifier,
    // even if an outdated/replayed client supplies the original same UTC.
    await expect(run(dir, first.sourceHash, RENAME, ID1, T1))
      .rejects.toMatchObject({ code: "DUPLICATE_CHANGESET" });
    expect(dir.files.get(NAME)).toEqual(bytes);
    expect((await inspectManagedSave(dir.handle(), NAME)).status).toBe("READY");
    expect(dir.files.has(managedFileNames(NAME).stage)).toBe(false);
    expect((await book(bytes)).getWorksheet("ProjectAudit")!.rowCount).toBe(10);
  });

  it("refuses a project Save when its ChangeSetID is already committed by task UpdateHistory", async () => {
    const dir = await fixture();
    const loadedHash = await captureManagedSourceHash(dir.handle(), NAME);
    const task = await saveManagedDirect({
      directory: dir.handle(), sourceName: NAME, loadedHash,
      taskId: "1", changes: { Title: "Task saved first" },
      appVersion: "f3d-qa", changeSetId: ID1, timestampUTC: T1,
    });
    expect(task.kind).toBe("saved");
    if (task.kind !== "saved") return;
    const before = Uint8Array.from(dir.files.get(NAME)!);
    await expect(run(dir, task.sourceHash, INITIAL, ID1, T1))
      .rejects.toMatchObject({ code: "DUPLICATE_CHANGESET" });
    expect(dir.files.get(NAME)).toEqual(before);
    expect(dir.files.has(managedFileNames(NAME).stage)).toBe(false);
    expect((await inspectManagedSave(dir.handle(), NAME)).status).toBe("READY");
  });

  it("alternating project and task direct Saves retains both separate histories and latest backup", async () => {
    const { dir, first } = await initialized();
    const taskEdit = await saveManagedDirect({
      directory: dir.handle(), sourceName: NAME, loadedHash: first.sourceHash,
      taskId: "1", changes: { Title: "Updated milestone" },
      appVersion: "f3d-qa", changeSetId: ID2, timestampUTC: T2,
    });
    expect(taskEdit.kind).toBe("saved");
    if (taskEdit.kind !== "saved") return;
    const beforeRename = Uint8Array.from(dir.files.get(NAME)!);
    const renamed = await run(dir, taskEdit.sourceHash, RENAME, ID3, T3);
    expect(renamed.kind).toBe("saved");
    if (renamed.kind !== "saved") return;
    const current = await book(dir.files.get(NAME)!);
    expect(current.getWorksheet("ProjectWBS")!.getCell("B2").value).toBe("Updated milestone");
    expect(current.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("Updated Shared Program");
    expect(current.getWorksheet("UpdateHistory")!.rowCount).toBe(2);
    expect(current.getWorksheet("ProjectAudit")!.rowCount).toBe(11);
    expect(dir.files.get(managedFileNames(NAME).backup)).toEqual(beforeRename);
    expect((await inspectManagedSave(dir.handle(), NAME)).status).toBe("READY");
  });

  it("source-close interruption retains predecessor stage and pending recovery, refuses retry", async () => {
    const { dir, first } = await initialized();
    dir.failAfterClose = NAME;
    await expect(run(dir, first.sourceHash, RENAME, ID2, T2))
      .rejects.toThrow("Simulated file-close interruption");
    const files = managedFileNames(NAME);
    expect(dir.files.has(files.stage)).toBe(true);
    expect(dir.files.has(files.transaction)).toBe(true);
    expect((await inspectManagedSave(dir.handle(), NAME)).status).toBe("NEEDS_BACKUP");
    await expect(run(dir, first.sourceHash, RENAME, ID2, T2))
      .rejects.toMatchObject({ code: "UNRESOLVED_SAVE" });
  });

  it("backup-close interruption leaves verified incomplete recovery for project Save", async () => {
    const { dir, first } = await initialized();
    const filenames = managedFileNames(NAME);
    dir.failAfterClose = filenames.backup;
    await expect(run(dir, first.sourceHash, RENAME, ID2, T2))
      .rejects.toThrow("Simulated file-close interruption");
    const state = await inspectManagedSave(dir.handle(), NAME);
    expect(state.status).toBe("BACKUP_VERIFIED");
    expect(dir.files.has(filenames.stage)).toBe(true);
    expect(dir.files.has(filenames.transaction)).toBe(true);
  });
});
