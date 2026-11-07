import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { preflightManagedWorkbook } from "../../src/managed/preflight";

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

describe("Stage A raw ZIP central-directory duplicate characterization", () => {
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
