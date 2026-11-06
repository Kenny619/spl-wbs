import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  captureManagedSourceHash, inspectManagedSave, managedFileNames, saveManagedDirect, sha256,
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

  it("refuses recovery artifacts as active workbook names", () => {
    expect(() => managedFileNames("../Other.xlsx")).toThrow();
    expect(() => managedFileNames("Plan.backup.xlsx")).toThrow();
    expect(() => managedFileNames("Plan.stage.xlsx")).toThrow();
  });
});
