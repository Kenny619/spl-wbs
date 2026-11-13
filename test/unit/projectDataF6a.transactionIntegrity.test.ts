import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  captureManagedSourceHash, inspectManagedSave, managedFileNames,
  saveManagedProjectDirect, saveManagedDirect, sha256,
} from "../../src/managed/directSave";
import { inspectProjectData } from "../../src/managed/projectDataInspector";
import { projectWatchProjection } from "../../src/managed/watchProjection";
import type { ProjectEdit } from "../../src/managed/projectDataCandidate";

const FILE = "SharedProject.xlsx";
const PROJECT = "bd95a399-257e-4b42-ac0e-fb6ee984c1aa";
const R1 = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
const R2 = "ed58f70a-126e-4dce-ace1-b578dc5c290e";
const TX_INIT = "c6dbf481-6868-48b7-b9b5-8726be2e2561";
const TX_ADD = "b013abb5-a99a-4c1d-9f43-74da7dbb0fd0";
const TX_SECOND = "10ab74bf-112a-4b2e-b6d1-262a87783a98";
const TX_TASK = "16f24730-9df2-425b-9a94-b54b4f24c90d";
const TX_RESOLVE = "fd526e80-635d-4938-adbd-78a6c4765748";
const T0 = "2026-11-12T00:00:00.000Z";
const T1 = "2026-11-12T01:00:00.000Z";
const T2 = "2026-11-12T02:00:00.000Z";
const T3 = "2026-11-12T03:00:00.000Z";
const T4 = "2026-11-12T04:00:00.000Z";
const ACTOR = "Unverified local editor";
const add = (reasonId: string, title: string): ProjectEdit => ({
  kind: "add-watch-reason", reasonId, taskId: "1", title,
  details: "Recorded stakeholder note", evidenceRef: "Evidence register",
});
const resolve: ProjectEdit = {
  kind: "resolve-watch-reason", reasonId: R1, resolutionNote: "Confirmed workaround delivered",
};

class FaultDirectory {
  readonly files = new Map<string, Uint8Array>();
  failAfterClose: string | null = null;

  async getFileHandle(filename: string, options: { create?: boolean } = {}) {
    if (!this.files.has(filename)) {
      if (!options.create) {
        throw Object.assign(new Error("Missing " + filename), { name: "NotFoundError" });
      }
      this.files.set(filename, new Uint8Array());
    }
    return {
      getFile: async () => ({
        arrayBuffer: async () => Uint8Array.from(this.files.get(filename)!).buffer,
      }),
      createWritable: async () => {
        let candidate = new Uint8Array();
        return {
          write: async (data: Uint8Array) => { candidate = Uint8Array.from(data); },
          close: async () => {
            this.files.set(filename, candidate);
            if (this.failAfterClose === filename) {
              throw new Error("Injected close failure: " + filename);
            }
          },
        };
      },
    };
  }
  async removeEntry(filename: string) {
    if (!this.files.delete(filename)) {
      throw Object.assign(new Error("Missing " + filename), { name: "NotFoundError" });
    }
  }
  handle(): FileSystemDirectoryHandle { return this as unknown as FileSystemDirectoryHandle; }
}

async function makeLegacy(): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  const wbs = book.addWorksheet("ProjectWBS");
  wbs.addRow([
    "ID", "Title", "WBSCode", "ParentTaskID", "TaskType", "TaskStatus",
    "PlannedStart", "PlannedEnd", "Updates", "CustomerTrace",
  ]);
  wbs.addRow([1, "Review delivery", "1", null, "Task", "In Progress",
    "2026-11-10", "2026-11-20", "Keep task's existing rich-free update", "cust-1"]);
  wbs.getCell("J2").font = { bold: true };
  const user = book.addWorksheet("CustomerCustom");
  user.addRow(["Group", "Keep this worksheet"]);
  user.getCell("B1").font = { italic: true };
  return new Uint8Array(await book.xlsx.writeBuffer());
}
async function decode(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return book;
}
async function seeded() {
  const dir = new FaultDirectory();
  dir.files.set(FILE, await makeLegacy());
  const loaded = await captureManagedSourceHash(dir.handle(), FILE);
  const init = await saveManagedProjectDirect({
    directory: dir.handle(), sourceName: FILE, loadedHash: loaded,
    edit: { kind: "initialize", projectId: PROJECT, projectName: "Shared Alpha" },
    changeSetId: TX_INIT, timestampUTC: T0, actorLabel: ACTOR, appVersion: "f6a-qa",
  });
  if (init.kind !== "saved") throw new Error("Synthetic initialization failed");
  return { dir, loadedHash: init.sourceHash };
}
async function save(
  dir: FaultDirectory, loadedHash: string,
  edit: ProjectEdit, changeSetId = TX_ADD, timestampUTC = T1,
) {
  return saveManagedProjectDirect({
    directory: dir.handle(), sourceName: FILE, loadedHash,
    edit, changeSetId, timestampUTC, actorLabel: ACTOR, appVersion: "f6a-qa",
  });
}
function countEvents(book: ExcelJS.Workbook, reasonId: string, action?: string): number {
  const audit = book.getWorksheet("ProjectAudit")!;
  let result = 0;
  for (let i = 2; i <= audit.rowCount; i++) {
    const row = audit.getRow(i);
    if (row.getCell(5).value === reasonId && (!action || row.getCell(7).value === action)) result++;
  }
  return result;
}

describe("F6a independent adversarial project-data Save integrity (synthetic only)", () => {
  it.each([
    ["stage", "STOP", false],
    ["transaction", "BEFORE_WRITE", false],
    ["source", "NEEDS_BACKUP", true],
    ["backup", "BACKUP_VERIFIED", true],
    ["owner", "BACKUP_VERIFIED", true],
  ] as const)(
    "injected interruption after %s close: recovery %s, Watch committed bytes? %s",
    async (step, status, sourceMayContainWatch) => {
      const { dir, loadedHash } = await seeded();
      const names = managedFileNames(FILE);
      const before = Uint8Array.from(dir.files.get(FILE)!);
      const beforeHash = await sha256(before);
      const target = step === "source" ? names.source : step === "stage" ? names.stage :
        step === "transaction" ? names.transaction : step === "backup" ? names.backup : names.owner;
      dir.failAfterClose = target;
      await expect(save(dir, loadedHash, add(R1, "Supplier awaiting decision")))
        .rejects.toThrow("Injected close failure: " + target);
      const inspection = await inspectManagedSave(dir.handle(), FILE);
      expect(inspection.status).toBe(status);
      expect(dir.files.has(names.stage)).toBe(true);
      expect(dir.files.has(names.transaction)).toBe(step !== "stage");

      const current = dir.files.get(FILE)!;
      expect(await sha256(current) === beforeHash).toBe(!sourceMayContainWatch);
      const book = await decode(current);
      expect(inspectProjectData(book).kind).toBe("valid");
      expect(book.getWorksheet("ProjectWBS")!.getCell("B2").value).toBe("Review delivery");
      expect(book.getWorksheet("CustomerCustom")!.getCell("B1").value).toBe("Keep this worksheet");
      const projected = await projectWatchProjection(current);
      expect(projected.tasks[0].disposition)
        .toBe(sourceMayContainWatch ? "Under Watch" : "Unknown");
      if (sourceMayContainWatch) {
        expect(countEvents(book, R1, "Create")).toBe(9);
        expect(dir.files.get(names.stage)).toEqual(before);
      } else {
        expect(dir.files.get(names.source)).toEqual(before);
      }
      dir.failAfterClose = null;
      await expect(save(dir, loadedHash, add(R1, "Retry forbidden"), TX_SECOND, T2))
        .rejects.toMatchObject({ code: "UNRESOLVED_SAVE" });
      expect((await inspectManagedSave(dir.handle(), FILE)).status).toBe(status);
    },
  );

  it("two stale editors cannot silently overwrite one committed Watch reason", async () => {
    const { dir, loadedHash } = await seeded();
    const editorA = loadedHash;
    const editorB = loadedHash;
    const first = await save(dir, editorA, add(R1, "Dependency A"));
    expect(first.kind).toBe("saved");
    if (first.kind !== "saved") return;
    const ownerBefore = Uint8Array.from(dir.files.get(managedFileNames(FILE).owner)!);
    const backupBefore = Uint8Array.from(dir.files.get(managedFileNames(FILE).backup)!);
    const liveBefore = Uint8Array.from(dir.files.get(FILE)!);
    await expect(save(dir, editorB, add(R2, "Dependency B"), TX_SECOND, T2))
      .rejects.toMatchObject({ code: "STALE_SOURCE" });
    expect(dir.files.get(FILE)).toEqual(liveBefore);
    expect(dir.files.get(managedFileNames(FILE).backup)).toEqual(backupBefore);
    expect(dir.files.get(managedFileNames(FILE).owner)).toEqual(ownerBefore);
    expect(dir.files.has(managedFileNames(FILE).transaction)).toBe(false);
    expect(dir.files.has(managedFileNames(FILE).stage)).toBe(false);

    // After an explicit reload, sequential Editor B may append a new reason.
    const reloadedHash = await captureManagedSourceHash(dir.handle(), FILE);
    const next = await save(dir, reloadedHash, add(R2, "Dependency B"), TX_SECOND, T2);
    expect(next.kind).toBe("saved");
    const projection = await projectWatchProjection(dir.files.get(FILE)!);
    expect(projection.tasks[0].openReasons.map(x => x.reasonId)).toEqual([R1, R2]);
    const committed = await decode(dir.files.get(FILE)!);
    expect(countEvents(committed, R1, "Create")).toBe(9);
    expect(countEvents(committed, R2, "Create")).toBe(9);
    expect((await inspectManagedSave(dir.handle(), FILE)).status).toBe("READY");
  });

  it("sequential Watch Add → task edit → Watch Resolve preserves both independent histories", async () => {
    const { dir, loadedHash } = await seeded();
    const added = await save(dir, loadedHash, add(R1, "Committed delivery watch"));
    expect(added.kind).toBe("saved");
    if (added.kind !== "saved") return;
    const afterAdd = Uint8Array.from(dir.files.get(FILE)!);
    const firstBook = await decode(afterAdd);
    const firstAuditCount = firstBook.getWorksheet("ProjectAudit")!.rowCount;
    const taskResult = await saveManagedDirect({
      directory: dir.handle(), sourceName: FILE, loadedHash: added.sourceHash,
      taskId: "1", changes: { Title: "Updated delivery" },
      changeSetId: TX_TASK, timestampUTC: T3, appVersion: "f6a-qa",
    });
    expect(taskResult.kind).toBe("saved");
    if (taskResult.kind !== "saved") return;
    const beforeResolve = Uint8Array.from(dir.files.get(FILE)!);
    const resolveResult = await save(dir, taskResult.sourceHash, resolve, TX_RESOLVE, T4);
    expect(resolveResult.kind).toBe("saved");
    if (resolveResult.kind !== "saved") return;

    const current = await decode(dir.files.get(FILE)!);
    expect(inspectProjectData(current).kind).toBe("valid");
    expect(current.getWorksheet("ProjectWBS")!.getCell("B2").value).toBe("Updated delivery");
    expect(current.getWorksheet("ProjectWBS")!.getCell("I2").value)
      .toBe("Keep task's existing rich-free update");
    expect(current.getWorksheet("ProjectWBS")!.getCell("J2").value).toBe("cust-1");
    expect(current.getWorksheet("ProjectWBS")!.getCell("J2").font.bold).toBe(true);
    expect(current.getWorksheet("CustomerCustom")!.getCell("B1").font.italic).toBe(true);
    expect(current.getWorksheet("UpdateHistory")!.rowCount).toBe(2);
    expect(current.getWorksheet("ProjectAudit")!.rowCount).toBe(firstAuditCount + 5);
    expect(countEvents(current, R1, "Create")).toBe(9);
    expect(countEvents(current, R1, "Resolve")).toBe(5);
    expect(current.getWorksheet("ProjectCommitments")!.rowCount).toBe(1);
    const projection = await projectWatchProjection(dir.files.get(FILE)!);
    expect(projection.tasks[0].disposition).toBe("Unknown");
    expect(projection.tasks[0].resolvedReasons[0]).toMatchObject({
      reasonId: R1, openedUTC: T1, resolvedUTC: T4,
    });
    expect(dir.files.get(managedFileNames(FILE).backup)).toEqual(beforeResolve);
    expect((await inspectManagedSave(dir.handle(), FILE)).status).toBe("READY");
  });

  it("tampered audit TaskID makes Watch project candidate fail before staging", async () => {
    const { dir, loadedHash } = await seeded();
    const added = await save(dir, loadedHash, add(R1, "Recorded risk"));
    expect(added.kind).toBe("saved");
    if (added.kind !== "saved") return;
    const edited = await decode(dir.files.get(FILE)!);
    const audit = edited.getWorksheet("ProjectAudit")!;
    let modified = false;
    for (let i = 2; i <= audit.rowCount; i++) {
      const row = audit.getRow(i);
      if (row.getCell(5).value === R1) {
        row.getCell(6).value = "2"; // mismatches actual Watch reason TaskID=1.
        modified = true;
        break;
      }
    }
    expect(modified).toBe(true);
    const tampered = new Uint8Array(await edited.xlsx.writeBuffer());
    dir.files.set(FILE, tampered);
    const fingerprint = await captureManagedSourceHash(dir.handle(), FILE);
    await expect(save(dir, fingerprint, add(R2, "Should not be written"), TX_SECOND, T2))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    expect(dir.files.get(FILE)).toEqual(tampered);
    expect(dir.files.has(managedFileNames(FILE).stage)).toBe(false);
    expect(dir.files.has(managedFileNames(FILE).transaction)).toBe(false);
  });
});
