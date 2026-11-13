import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  captureManagedSourceHash, inspectManagedSave, managedFileNames,
  saveManagedDirect, saveManagedProjectDirect, sha256,
} from "../../src/managed/directSave";
import type { ProjectEdit } from "../../src/managed/projectDataCandidate";
import { inspectProjectData } from "../../src/managed/projectDataInspector";
import { readProjectContext, remainingProjectDays } from "../../src/managed/projectContext";
import { projectWatchProjection } from "../../src/managed/watchProjection";
import { projectCommitmentProjection } from "../../src/managed/commitmentProjection";
import { bundledHolidayCalendar } from "../../src/calendar/jpHolidays";

/**
 * F7 cross-feature release-readiness smoke: ONE synthetic canonical workbook
 * advances through the actual existing guarded task / project Save APIs.
 * These are SEQUENTIAL commits, not a claim of atomic multi-domain SAVE-01,
 * browser UAT, corporate Excel locks, authenticated actors or auto Watch Green.
 */
const FILE = "IntegratedProject.xlsx";
const PID = "bd95a399-257e-4b42-ac0e-fb6ee984c1aa";
const BID = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
const RID = "ed58f70a-126e-4dce-ace1-b578dc5c290e";
const TX = [
  "c6dbf481-6868-48b7-b9b5-8726be2e2561",
  "b013abb5-a99a-4c1d-9f43-74da7dbb0fd0",
  "10ab74bf-112a-4b2e-b6d1-262a87783a98",
  "16f24730-9df2-425b-9a94-b54b4f24c90d",
  "fd526e80-635d-4938-adbd-78a6c4765748",
] as const;
const TIMESTAMP = [
  "2026-11-13T00:00:00.000Z",
  "2026-11-13T01:00:00.000Z",
  "2026-11-13T02:00:00.000Z",
  "2026-11-13T03:00:00.000Z",
  "2026-11-13T04:00:00.000Z",
] as const;
const ACTOR = "Unverified editor";

class DisposableDirectory {
  readonly files = new Map<string, Uint8Array>();
  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (!this.files.has(name)) {
      if (!options.create) throw Object.assign(new Error("Absent: " + name), { name: "NotFoundError" });
      this.files.set(name, new Uint8Array());
    }
    return {
      getFile: async () => ({
        arrayBuffer: async () => Uint8Array.from(this.files.get(name)!).buffer,
      }),
      createWritable: async () => {
        let pending = new Uint8Array();
        return {
          write: async (next: Uint8Array) => { pending = Uint8Array.from(next); },
          close: async () => { this.files.set(name, pending); },
        };
      },
    };
  }
  async removeEntry(name: string) {
    if (!this.files.delete(name)) throw Object.assign(new Error("Absent: " + name), { name: "NotFoundError" });
  }
  handle(): FileSystemDirectoryHandle { return this as unknown as FileSystemDirectoryHandle; }
}

async function legacy(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const wbs = workbook.addWorksheet("ProjectWBS");
  wbs.addRow(["ID", "Title", "WBSCode", "ParentTaskID", "TaskType",
    "TaskStatus", "PlannedStart", "PlannedEnd", "Updates", "ExternalTracking"]);
  wbs.addRow([1, "Supply readiness", "1", null, "Task", "In Progress",
    "2026-11-02", "2026-11-20", "Keep original update", "vendor-key"]);
  wbs.getCell("J2").font = { bold: true };
  const custom = workbook.addWorksheet("ExternalRecords");
  custom.addRow(["Reference", "Preserve external sheet"]);
  custom.getCell("B1").font = { italic: true };
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
async function decode(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return book;
}
async function projectSave(
  dir: DisposableDirectory, loadedHash: string, edit: ProjectEdit, i: 0 | 1 | 3 | 4,
) {
  return saveManagedProjectDirect({
    directory: dir.handle(), sourceName: FILE, loadedHash, edit,
    changeSetId: TX[i], timestampUTC: TIMESTAMP[i],
    actorLabel: ACTOR, appVersion: "f7-integration-smoke",
  });
}
async function current(dir: DisposableDirectory) {
  return Uint8Array.from(dir.files.get(FILE)!);
}
function countAudit(book: ExcelJS.Workbook, changeSetId: string): number {
  const audit = book.getWorksheet("ProjectAudit")!;
  let count = 0;
  for (let row = 2; row <= audit.rowCount; row++) {
    if (audit.getRow(row).getCell(2).value === changeSetId) count++;
  }
  return count;
}

describe("F7: single committed XLSX across Calendar, Watch and task edits (synthetic only)", () => {
  it("keeps committed identity, blackout arithmetic, reason lifecycle, task history and recovery integrity across five sequential verified Saves", async () => {
    const dir = new DisposableDirectory();
    dir.files.set(FILE, await legacy());
    const startHash = await captureManagedSourceHash(dir.handle(), FILE);
    const first = await projectSave(dir, startHash, {
      kind: "initialize", projectId: PID, projectName: "Shared Integrated Program",
      blackout: { blackoutId: BID, startDate: "2026-11-17",
        endDate: "2026-11-18", label: "Project blackout" },
    }, 0);
    expect(first.kind).toBe("saved");
    if (first.kind !== "saved") throw Error("Initialization not saved");
    const initialContext = await readProjectContext(await current(dir));
    expect(initialContext.kind).toBe("valid");
    expect(remainingProjectDays("2026-11-20", "2026-11-13", "In Progress",
      bundledHolidayCalendar(), initialContext)).toEqual({ kind: "count", days: 3 });

    const added = await projectSave(dir, first.sourceHash, {
      kind: "add-watch-reason", reasonId: RID, taskId: "1",
      title: "Supplier readiness at risk", details: "Pending vendor response",
      evidenceRef: "Decision log",
    }, 1);
    expect(added.kind).toBe("saved");
    if (added.kind !== "saved") throw Error("Watch not saved");
    expect((await projectWatchProjection(await current(dir))).tasks[0].disposition)
      .toBe("Under Watch");

    const savedTask = await saveManagedDirect({
      directory: dir.handle(), sourceName: FILE, loadedHash: added.sourceHash,
      taskId: "1", changes: { PlannedEnd: "2026-11-24" },
      changeSetId: TX[2], timestampUTC: TIMESTAMP[2],
      appVersion: "f7-integration-smoke",
    });
    expect(savedTask.kind).toBe("saved");
    if (savedTask.kind !== "saved") throw Error("Task edit not saved");
    const afterTask = await current(dir);
    const beforeStale = await sha256(afterTask);
    const backupBeforeStale = Uint8Array.from(dir.files.get(managedFileNames(FILE).backup)!);

    // An editor holding the pre-task version cannot quietly replace Calendar.
    const changedCalendar: ProjectEdit = {
      kind: "set-blackout", blackout: { blackoutId: BID,
        startDate: "2026-11-16", endDate: "2026-11-20",
        label: "Extended project blackout" },
    };
    await expect(projectSave(dir, added.sourceHash, changedCalendar, 3))
      .rejects.toMatchObject({ code: "STALE_SOURCE" });
    expect(await sha256(await current(dir))).toBe(beforeStale);
    expect(dir.files.get(managedFileNames(FILE).backup)).toEqual(backupBeforeStale);
    expect(dir.files.has(managedFileNames(FILE).stage)).toBe(false);
    expect(dir.files.has(managedFileNames(FILE).transaction)).toBe(false);

    // Explicit reload, sequential Calendar Save, then independently audited Resolve.
    const reloaded = await captureManagedSourceHash(dir.handle(), FILE);
    expect(reloaded).toBe(savedTask.sourceHash);
    const changed = await projectSave(dir, reloaded, changedCalendar, 3);
    expect(changed.kind).toBe("saved");
    if (changed.kind !== "saved") throw Error("Calendar change not saved");
    const latestContext = await readProjectContext(await current(dir));
    expect(latestContext).toMatchObject({
      kind: "valid", projectName: "Shared Integrated Program",
      blackoutId: BID, blackoutLabel: "Extended project blackout",
      blackout: { enabled: true, start: "2026-11-16", end: "2026-11-20" },
    });
    expect(remainingProjectDays("2026-11-24", "2026-11-13", "In Progress",
      bundledHolidayCalendar(), latestContext)).toEqual({ kind: "count", days: 1 });

    const beforeResolve = await current(dir);
    const final = await projectSave(dir, changed.sourceHash, {
      kind: "resolve-watch-reason", reasonId: RID,
      resolutionNote: "Vendor commitment confirmed",
    }, 4);
    expect(final.kind).toBe("saved");
    if (final.kind !== "saved") throw Error("Watch resolution not saved");

    const verified = await current(dir);
    const book = await decode(verified);
    expect(inspectProjectData(book).kind).toBe("valid");
    expect(book.getWorksheet("ProjectWBS")!.getCell("H2").value).toBe("2026-11-24");
    expect(book.getWorksheet("ProjectWBS")!.getCell("I2").value).toBe("Keep original update");
    expect(book.getWorksheet("ProjectWBS")!.getCell("J2").value).toBe("vendor-key");
    expect(book.getWorksheet("ProjectWBS")!.getCell("J2").font.bold).toBe(true);
    expect(book.getWorksheet("ExternalRecords")!.getCell("B1").value).toBe("Preserve external sheet");
    expect(book.getWorksheet("ExternalRecords")!.getCell("B1").font.italic).toBe(true);
    expect(book.getWorksheet("UpdateHistory")!.rowCount).toBe(2);
    for (const tx of [TX[0], TX[1], TX[3], TX[4]]) {
      expect(countAudit(book, tx)).toBeGreaterThan(0);
    }
    expect(countAudit(book, TX[2])).toBe(0); // task-only event stays in UpdateHistory
    expect((await projectWatchProjection(verified)).tasks[0]).toMatchObject({
      disposition: "Unknown", openReasons: [], automaticChecksVerified: false,
    });
    const commitment = await projectCommitmentProjection(verified);
    expect(commitment.tasks[0]).toMatchObject({
      disposition: "Unconfirmed", latestRecorded: null, acceptanceAuthorityVerified: false,
    });
    expect(dir.files.get(managedFileNames(FILE).backup)).toEqual(beforeResolve);
    expect(await sha256(verified)).toBe(final.sourceHash);
    expect((await inspectManagedSave(dir.handle(), FILE)).status).toBe("READY");
  });
});
