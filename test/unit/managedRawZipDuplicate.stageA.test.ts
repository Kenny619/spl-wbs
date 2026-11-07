import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { preflightManagedWorkbook } from "../../src/managed/preflight";
import { saveManagedDirect, saveManagedAsCopy, sha256 } from "../../src/managed/directSave";

/**
 * Byte-level central-directory duplicate probe. Unlike JSZip.file() mutations,
 * this preserves two raw central records with the same filename.
 * Synthetic, in-memory data only; no filesystem or real workbook writes.
 */
function duplicateCentralRecord(input: Uint8Array, target: string): Uint8Array {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const u16 = (p: number) => view.getUint16(p, true);
  const u32 = (p: number) => view.getUint32(p, true);
  let eocd = -1;
  for (let p = input.length - 22; p >= Math.max(0, input.length - 65557); p--) {
    if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === input.length) { eocd = p; break; }
  }
  if (eocd < 0) throw new Error("EOCD not found");
  if (u16(eocd + 4) !== 0 || u16(eocd + 6) !== 0 || u16(eocd + 8) !== u16(eocd + 10)) {
    throw new Error("Unsupported ZIP layout");
  }
  const start = u32(eocd + 16);
  const size = u32(eocd + 12);
  let selected: Uint8Array | undefined;
  let cursor = start;
  const decoder = new TextDecoder();
  while (cursor < start + size) {
    if (u32(cursor) !== 0x02014b50) throw new Error("Bad central header");
    const nameLen = u16(cursor + 28);
    const len = 46 + nameLen + u16(cursor + 30) + u16(cursor + 32);
    const name = decoder.decode(input.subarray(cursor + 46, cursor + 46 + nameLen));
    if (name === target) selected = input.slice(cursor, cursor + len);
    cursor += len;
  }
  if (!selected || cursor !== start + size) throw new Error("Target not found");
  const result = new Uint8Array(input.length + selected.length);
  result.set(input.subarray(0, eocd), 0);
  result.set(selected, eocd);
  result.set(input.subarray(eocd), eocd + selected.length);
  const out = new DataView(result.buffer);
  const newEocd = eocd + selected.length;
  out.setUint16(newEocd + 8, u16(eocd + 8) + 1, true);
  out.setUint16(newEocd + 10, u16(eocd + 10) + 1, true);
  out.setUint32(newEocd + 12, size + selected.length, true);
  return result;
}

function mismatchLocalWorksheetName(input: Uint8Array): Uint8Array {
  const out = Uint8Array.from(input);
  const view = new DataView(out.buffer);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  let eocd = -1;
  for (let p = out.length - 22; p >= Math.max(0, out.length - 65557); p--) {
    if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === out.length) {
      eocd = p; break;
    }
  }
  if (eocd < 0) throw new Error("EOCD not found");
  let cursor = u32(eocd + 16);
  const end = cursor + u32(eocd + 12);
  while (cursor < end) {
    if (u32(cursor) !== 0x02014b50) throw new Error("Invalid central record");
    const nameLength = u16(cursor + 28);
    const name = new TextDecoder().decode(out.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name === "xl/worksheets/sheet1.xml") {
      const localOffset = u32(cursor + 42);
      const localNameStart = localOffset + 30;
      const localName = new TextDecoder().decode(out.subarray(localNameStart, localNameStart + u16(localOffset + 26)));
      if (localName !== name) throw new Error("Unexpected local name");
      const index = localNameStart + localName.lastIndexOf("sheet1.xml") + 5;
      out[index] = "2".charCodeAt(0);
      return out;
    }
    cursor += 46 + nameLength + u16(cursor + 30) + u16(cursor + 32);
  }
  throw new Error("Worksheet entry not found");
}

class DisposableRawDirectory {
  readonly files = new Map<string, Uint8Array>();
  writes = 0;
  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (!this.files.has(name)) {
      if (!options.create) throw Object.assign(new Error("Missing file"), { name: "NotFoundError" });
      this.writes++;
      this.files.set(name, new Uint8Array());
    }
    const dir = this;
    return {
      async getFile() {
        return { async arrayBuffer() { return Uint8Array.from(dir.files.get(name)!).buffer; } };
      },
      async createWritable() {
        let data = new Uint8Array();
        return {
          async write(value: Uint8Array) { data = Uint8Array.from(value); },
          async close() { dir.writes++; dir.files.set(name, data); },
        };
      },
    };
  }
  async removeEntry(name: string) { this.files.delete(name); }
  asHandle(): FileSystemDirectoryHandle { return this as unknown as FileSystemDirectoryHandle; }
}

describe("Stage A raw ZIP central-directory duplicate characterization", () => {
  it("blocks direct Save and Save As before writing any files for ambiguous raw ZIP", async () => {
    const book = new ExcelJS.Workbook();
    book.addWorksheet("ProjectWBS").addRow(["ID", "Title"]);
    const bytes = duplicateCentralRecord(
      new Uint8Array(await book.xlsx.writeBuffer()), "xl/worksheets/sheet1.xml",
    );
    const dir = new DisposableRawDirectory();
    dir.files.set("Plan.xlsx", Uint8Array.from(bytes));
    const before = Uint8Array.from(bytes);
    const loadedHash = await sha256(bytes);
    const edits = { taskId: "1", changes: { Title: "Changed" }, appVersion: "0.1.0" };
    await expect(saveManagedDirect({
      directory: dir.asHandle(), sourceName: "Plan.xlsx", loadedHash, ...edits,
    })).rejects.toMatchObject({ code: "UNSUPPORTED_PACKAGE" });
    await expect(saveManagedAsCopy({
      directory: dir.asHandle(), sourceName: "Plan.xlsx",
      destinationName: "Copy.xlsx", loadedBytes: bytes, loadedHash, ...edits,
    })).rejects.toMatchObject({ code: "UNSUPPORTED_PACKAGE" });
    expect(dir.writes).toBe(0);
    expect([...dir.files.keys()]).toEqual(["Plan.xlsx"]);
    expect(dir.files.get("Plan.xlsx")).toEqual(before);
  });

  it("rejects inconsistent local and central worksheet names", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("ProjectWBS").addRow(["ID", "Title"]);
    const source = mismatchLocalWorksheetName(new Uint8Array(await workbook.xlsx.writeBuffer()));
    const original = Uint8Array.from(source);
    await expect(preflightManagedWorkbook(source)).rejects.toMatchObject({ code: "UNSUPPORTED_PACKAGE" });
    expect(source).toEqual(original);
  });

  it("rejects two raw records for the same worksheet even when JSZip materializes one key", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("ProjectWBS").addRow(["ID", "Title"]);
    const original = new Uint8Array(await workbook.xlsx.writeBuffer());
    const rawDuplicate = duplicateCentralRecord(original, "xl/worksheets/sheet1.xml");
    const before = Uint8Array.from(rawDuplicate);
    // Characterize the upstream loader without equating its name-keyed map to raw ZIP records.
    const parsed = await JSZip.loadAsync(rawDuplicate);
    expect(Object.keys(parsed.files).filter(k => k === "xl/worksheets/sheet1.xml")).toHaveLength(1);
    // Safety expectation. A failure here is an actionable test finding, NOT permission to merge.
    await expect(preflightManagedWorkbook(rawDuplicate)).rejects.toMatchObject({
      code: "UNSUPPORTED_PACKAGE",
    });
    expect(rawDuplicate).toEqual(before);
  });
});
