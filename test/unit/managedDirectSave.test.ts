import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  captureManagedSourceHash, inspectManagedSave, managedFileNames, saveManagedDirect, saveManagedAsCopy, sha256,
} from "../../src/managed/directSave";

const SOURCE_NAME = "Plan.xlsx";
const ID = "4c2d16b9-bf8f-4eb4-99a4-0a449d7d8752";
const TIME = "2026-11-06T04:00:00.000Z";

class DisposableDirectory {
  readonly files = new Map<string, Uint8Array>();
  failAfterClose: string | null = null;
  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (!this.files.has(name)) {
      if (!options.create) throw Object.assign(new Error("Missing file: " + name), { name: "NotFoundError" });
      this.files.set(name, new Uint8Array());
    }
    const that = this;
    return {
      async getFile() {
        return { async arrayBuffer() { return Uint8Array.from(that.files.get(name)!).buffer; } };
      },
      async createWritable() {
        let staged = new Uint8Array();
        return {
          async write(value: Uint8Array) { staged = Uint8Array.from(value); },
          async close() {
            that.files.set(name, staged);
            if (name === that.failAfterClose) {
              throw Object.assign(new Error("Synthetic file close failure"), { name: "NotAllowedError" });
            }
          },
        };
      },
    };
  }
  async removeEntry(name: string) {
    if (!this.files.delete(name)) throw Object.assign(new Error("Missing"), { name: "NotFoundError" });
  }
  asHandle(): FileSystemDirectoryHandle { return this as unknown as FileSystemDirectoryHandle; }
}

async function fixture(): Promise<DisposableDirectory> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("ProjectWBS");
  sheet.addRow(["ID", "Title", "WBSCode", "TaskType", "Progress", "Updates"]);
  sheet.addRow([1, "Initial", "1", "Task", 10, "First note"]);
  const dir = new DisposableDirectory();
  dir.files.set(SOURCE_NAME, new Uint8Array(await book.xlsx.writeBuffer()));
  return dir;
}

async function run(dir: DisposableDirectory, loadedHash: string, title: string) {
  return saveManagedDirect({
    directory: dir.asHandle(), sourceName: SOURCE_NAME, loadedHash, taskId: "1",
    changes: { Title: title }, appVersion: "0.1.0", timestampUTC: TIME, changeSetId: ID,
  });
}

describe("managed Save: File System Access API adapter with disposable handles", () => {
  it("saves one candidate, verifies predecessor backup, then safely rotates on a second Save", async () => {
    const dir = await fixture();
    const original = Uint8Array.from(dir.files.get(SOURCE_NAME)!);
    const hash = await captureManagedSourceHash(dir.asHandle(), SOURCE_NAME);
    expect(hash).toBe(await sha256(original));
    const first = await run(dir, hash, "After first");
    expect(first.kind).toBe("saved");
    if (first.kind !== "saved") return;
    const files = managedFileNames(SOURCE_NAME);
    expect(await sha256(dir.files.get(files.backup)!)).toBe(hash);
    expect(dir.files.has(files.stage)).toBe(false);
    expect(dir.files.has(files.transaction)).toBe(false);
    expect((await inspectManagedSave(dir.asHandle(), SOURCE_NAME)).status).toBe("READY");

    const second = await run(dir, first.sourceHash, "After second");
    expect(second.kind).toBe("saved");
    if (second.kind !== "saved") return;
    expect(await sha256(dir.files.get(files.backup)!)).toBe(first.sourceHash);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(dir.files.get(SOURCE_NAME)! as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    expect(book.getWorksheet("ProjectWBS")?.getCell("B2").value).toBe("After second");
    expect(book.getWorksheet("UpdateHistory")?.rowCount).toBe(3);
  });

  it("stale source and foreign backup block before creating staging files", async () => {
    const dir = await fixture();
    const hash = await captureManagedSourceHash(dir.asHandle(), SOURCE_NAME);
    dir.files.set(SOURCE_NAME, new TextEncoder().encode("Changed by another program"));
    await expect(run(dir, hash, "Change")).rejects.toMatchObject({ code: "STALE_SOURCE" });
    expect(dir.files.has(managedFileNames(SOURCE_NAME).stage)).toBe(false);

    const next = await fixture();
    next.files.set(managedFileNames(SOURCE_NAME).backup, new TextEncoder().encode("Foreign backup"));
    await expect(run(next, await sha256(next.files.get(SOURCE_NAME)!), "Change"))
      .rejects.toMatchObject({ code: "UNRESOLVED_SAVE" });
    expect(next.files.has(managedFileNames(SOURCE_NAME).stage)).toBe(false);
  });

  it("no-op performs no disk writes and leaves no backup or history sheet", async () => {
    const dir = await fixture();
    const hash = await captureManagedSourceHash(dir.asHandle(), SOURCE_NAME);
    const outcome = await run(dir, hash, "Initial");
    expect(outcome).toEqual({ kind: "noop", sourceHash: hash });
    expect(dir.files.size).toBe(1);
  });

  it("after source-close error, inspector preserves stage and reports incomplete backup", async () => {
    const dir = await fixture();
    const hash = await captureManagedSourceHash(dir.asHandle(), SOURCE_NAME);
    dir.failAfterClose = SOURCE_NAME;
    await expect(run(dir, hash, "New title")).rejects.toThrow("Synthetic file close failure");
    const files = managedFileNames(SOURCE_NAME);
    expect(await sha256(dir.files.get(files.stage)!)).toBe(hash);
    expect(dir.files.has(files.transaction)).toBe(true);
    const report = await inspectManagedSave(dir.asHandle(), SOURCE_NAME);
    expect(report.status).toBe("NEEDS_BACKUP");
    await expect(run(dir, hash, "Attempt retry")).rejects.toMatchObject({ code: "UNRESOLVED_SAVE" });
  });

  it("after backup close error, preserves staging and never reports false success", async () => {
    const dir = await fixture();
    const hash = await captureManagedSourceHash(dir.asHandle(), SOURCE_NAME);
    dir.failAfterClose = managedFileNames(SOURCE_NAME).backup;
    await expect(run(dir, hash, "New title")).rejects.toThrow("Synthetic file close failure");
    expect((await inspectManagedSave(dir.asHandle(), SOURCE_NAME)).status).toBe("BACKUP_VERIFIED");
    expect(dir.files.has(managedFileNames(SOURCE_NAME).stage)).toBe(true);
  });

  it("rotating backup interruption verifies predecessor but rejects forged or corrupt owner metadata", async () => {
    const dir = await fixture();
    const firstHash = await captureManagedSourceHash(dir.asHandle(), SOURCE_NAME);
    const first = await run(dir, firstHash, "First committed");
    expect(first.kind).toBe("saved");
    if (first.kind !== "saved") return;
    const names = managedFileNames(SOURCE_NAME);
    const oldOwner = Uint8Array.from(dir.files.get(names.owner)!);

    dir.failAfterClose = names.backup;
    await expect(run(dir, first.sourceHash, "Second incomplete")).rejects.toThrow("Synthetic file close failure");
    expect((await inspectManagedSave(dir.asHandle(), SOURCE_NAME)).status).toBe("BACKUP_VERIFIED");
    expect(dir.files.get(names.owner)).toEqual(oldOwner); // valid old ownership is expected mid-rotation

    const corrupted = new TextEncoder().encode(JSON.stringify({
      protocol: "spt-wbs-managed-v1", source: SOURCE_NAME, backupHash: "e".repeat(64),
    }));
    dir.files.set(names.owner, corrupted);
    const inspection = await inspectManagedSave(dir.asHandle(), SOURCE_NAME);
    expect(inspection.status).toBe("STOP");
    expect(inspection.reason).toMatch(/ownership/i);
    await expect(run(dir, first.sourceHash, "Must not retry")).rejects.toMatchObject({
      code: "UNRESOLVED_SAVE",
    });
    expect(dir.files.has(names.stage)).toBe(true);
    expect(dir.files.has(names.transaction)).toBe(true);
  });

  it("pending recovery detects a missing prior owner and tampered transaction lineage", async () => {
    const dir = await fixture();
    const original = await captureManagedSourceHash(dir.asHandle(), SOURCE_NAME);
    const first = await run(dir, original, "First committed");
    expect(first.kind).toBe("saved");
    if (first.kind !== "saved") return;
    const names = managedFileNames(SOURCE_NAME);
    dir.failAfterClose = SOURCE_NAME;
    await expect(run(dir, first.sourceHash, "Second incomplete")).rejects.toThrow("Synthetic file close failure");
    expect((await inspectManagedSave(dir.asHandle(), SOURCE_NAME)).status).toBe("NEEDS_BACKUP");
    const owner = dir.files.get(names.owner)!;
    dir.files.delete(names.owner);
    expect((await inspectManagedSave(dir.asHandle(), SOURCE_NAME)).status).toBe("STOP");
    dir.files.set(names.owner, owner);

    const pending = JSON.parse(new TextDecoder().decode(dir.files.get(names.transaction)!)) as {
      priorBackup: string | null;
    };
    pending.priorBackup = "f".repeat(64);
    dir.files.set(names.transaction, new TextEncoder().encode(JSON.stringify(pending)));
    expect((await inspectManagedSave(dir.asHandle(), SOURCE_NAME)).status).toBe("STOP");
  });

  it("refuses recovery artifacts as active workbook names", () => {
    expect(() => managedFileNames("../Other.xlsx")).toThrow();
    expect(() => managedFileNames("Plan.backup.xlsx")).toThrow();
    expect(() => managedFileNames("Plan.stage.xlsx")).toThrow();
  });
  it("Save As from loaded baseline creates a new copy, preserves source and switches future backup lifecycle", async () => {
    const dir = await fixture();
    const original = Uint8Array.from(dir.files.get(SOURCE_NAME)!);
    const loadedHash = await sha256(original);
    const saved = await saveManagedAsCopy({
      directory: dir.asHandle(), sourceName: SOURCE_NAME, destinationName: "Plan-copy.xlsx",
      loadedBytes: original, loadedHash, taskId: "1", changes: { Title: "Copied title" },
      appVersion: "0.1.0", timestampUTC: TIME, changeSetId: ID,
    });
    expect(saved).toMatchObject({
      kind: "saved-copy", sourceName: SOURCE_NAME, destinationName: "Plan-copy.xlsx", changeSetId: ID,
    });
    expect(dir.files.get(SOURCE_NAME)).toEqual(original);
    const newNames = managedFileNames("Plan-copy.xlsx");
    expect(dir.files.has(newNames.stage)).toBe(false);
    expect(dir.files.has(newNames.backup)).toBe(false);
    expect(await captureManagedSourceHash(dir.asHandle(), "Plan-copy.xlsx")).toBe(saved.destinationHash);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(dir.files.get(newNames.source)! as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    expect(book.getWorksheet("ProjectWBS")?.getCell("B2").value).toBe("Copied title");
    expect(book.getWorksheet("UpdateHistory")?.rowCount).toBe(2);

    const second = await saveManagedDirect({
      directory: dir.asHandle(), sourceName: "Plan-copy.xlsx",
      loadedHash: saved.destinationHash, taskId: "1", changes: { Title: "Next change" },
      appVersion: "0.1.0", timestampUTC: TIME,
    });
    expect(second.kind).toBe("saved");
    expect(await sha256(dir.files.get(newNames.backup)!)).toBe(saved.destinationHash);
    expect(dir.files.get(SOURCE_NAME)).toEqual(original);
  });

  it("Save As blocks destination, sidecar collisions, and same source name before writing", async () => {
    const dir = await fixture();
    const snapshot = Uint8Array.from(dir.files.get(SOURCE_NAME)!);
    const loadedHash = await sha256(snapshot);
    const input = {
      directory: dir.asHandle(), sourceName: SOURCE_NAME, destinationName: "New.xlsx",
      loadedBytes: snapshot, loadedHash, taskId: "1", changes: { Title: "Copy" },
      appVersion: "0.1.0", timestampUTC: TIME,
    };
    await expect(saveManagedAsCopy({ ...input, destinationName: SOURCE_NAME }))
      .rejects.toMatchObject({ code: "SAME_DESTINATION" });
    dir.files.set("New.xlsx", new TextEncoder().encode("unrelated user bytes"));
    await expect(saveManagedAsCopy(input)).rejects.toMatchObject({ code: "FILE_COLLISION" });
    expect(new TextDecoder().decode(dir.files.get("New.xlsx"))).toBe("unrelated user bytes");
    dir.files.delete("New.xlsx");
    dir.files.set("New.stage.xlsx", new TextEncoder().encode("unknown staging"));
    await expect(saveManagedAsCopy(input)).rejects.toMatchObject({ code: "FILE_COLLISION" });
    expect(dir.files.get(SOURCE_NAME)).toEqual(snapshot);
  });

  it("Save As conflict uses last loaded baseline and does not overwrite changed external source", async () => {
    const dir = await fixture();
    const original = Uint8Array.from(dir.files.get(SOURCE_NAME)!);
    const loadedHash = await sha256(original);
    const changed = new TextEncoder().encode("EXTERNAL MODIFICATION");
    dir.files.set(SOURCE_NAME, changed);
    const result = await saveManagedAsCopy({
      directory: dir.asHandle(), sourceName: SOURCE_NAME,
      destinationName: "Conflict-copy.xlsx", loadedBytes: original, loadedHash,
      taskId: "1", changes: { Title: "From loaded snapshot" }, appVersion: "0.1.0",
      timestampUTC: TIME, changeSetId: ID,
    });
    expect(result.destinationName).toBe("Conflict-copy.xlsx");
    expect(dir.files.get(SOURCE_NAME)).toEqual(changed);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(dir.files.get("Conflict-copy.xlsx")! as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    expect(book.getWorksheet("ProjectWBS")?.getCell("B2").value).toBe("From loaded snapshot");
    await expect(saveManagedAsCopy({
      directory: dir.asHandle(), sourceName: SOURCE_NAME, destinationName: "Other.xlsx",
      loadedBytes: original, loadedHash: "a".repeat(64), taskId: "1",
      changes: {}, appVersion: "0.1.0",
    })).rejects.toMatchObject({ code: "INVALID_LOAD_SNAPSHOT" });
  });

  it("Save As close failure retains staging and does not falsely report new workbook active", async () => {
    const dir = await fixture();
    const original = Uint8Array.from(dir.files.get(SOURCE_NAME)!);
    dir.failAfterClose = "Interrupted.xlsx";
    await expect(saveManagedAsCopy({
      directory: dir.asHandle(), sourceName: SOURCE_NAME, destinationName: "Interrupted.xlsx",
      loadedBytes: original, loadedHash: await sha256(original), taskId: "1",
      changes: { Title: "Uncertain" }, appVersion: "0.1.0",
      timestampUTC: TIME, changeSetId: ID,
    })).rejects.toThrow("Synthetic file close failure");
    const names = managedFileNames("Interrupted.xlsx");
    expect(dir.files.has(names.stage)).toBe(true);
    expect((await inspectManagedSave(dir.asHandle(), names.source)).status).toBe("STOP");
    expect(dir.files.get(SOURCE_NAME)).toEqual(original);
  });

  it("Save As with no edits copies the baseline without inventing history", async () => {
    const dir = await fixture();
    const snapshot = Uint8Array.from(dir.files.get(SOURCE_NAME)!);
    const out = await saveManagedAsCopy({
      directory: dir.asHandle(), sourceName: SOURCE_NAME, destinationName: "Unchanged.xlsx",
      loadedBytes: snapshot, loadedHash: await sha256(snapshot), taskId: "1",
      changes: {}, appVersion: "0.1.0",
    });
    expect(out.changeSetId).toBeNull();
    expect(await sha256(dir.files.get("Unchanged.xlsx")!)).toBe(await sha256(snapshot));
    expect(dir.files.get(SOURCE_NAME)).toEqual(snapshot);
  });

});
