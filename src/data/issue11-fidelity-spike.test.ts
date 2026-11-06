// Issue #11: one focused, test-only ExcelJS feasibility gate.
// Demonstrates serializer behavior; does NOT implement the managed save workflow.
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

const HEADERS = [
  "ChangeSetID", "TimestampUTC", "TaskID", "WBSCode", "TaskTitle",
  "Field", "OldValue", "NewValue", "Source", "AppVersion",
];
const ID = "e6a1f5c1-8a63-4b99-8ec5-f3c178e2f660";
const WHEN = "2026-11-06T00:00:00.000Z";

async function reload(data: Uint8Array | ArrayBuffer) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(data as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return book;
}

async function fixture() {
  const book = new ExcelJS.Workbook();
  const tasks = book.addWorksheet("ProjectWBS");
  tasks.addRow(["ID", "Title", "WBSCode", "Progress", "Updates"]);
  tasks.addRow([501, "Synthetic milestone", "1.2", 20, "Initial update"]);
  tasks.getCell("D2").numFmt = '0"%"';
  const history = book.addWorksheet("UpdateHistory");
  history.addRow(HEADERS);
  history.addRow(["historic", "2026-11-05T00:00:00.000Z", 501, "1.2", "Synthetic milestone", "Progress", "0", "20", "Web UI", "0.0-test"]);
  const unrelated = book.addWorksheet("Reference");
  unrelated.getCell("A1").value = "Do not discard this worksheet";
  unrelated.getCell("A1").font = { bold: true };
  return book;
}

describe("Issue #11: minimum ExcelJS fidelity gate (synthetic only)", () => {
  it("round-trips a two-field change and append-only history while preserving unrelated sheet", async () => {
    const book = await reload(await (await fixture()).xlsx.writeBuffer());
    const tasks = book.getWorksheet("ProjectWBS")!;
    tasks.getCell("D2").value = 45;
    tasks.getCell("E2").value = "Initial update\nFollow-up";
    const history = book.getWorksheet("UpdateHistory")!;
    history.addRow([ID, WHEN, 501, "1.2", "Synthetic milestone", "Progress", "20", "45", "Web UI", "test"]);
    history.addRow([ID, WHEN, 501, "1.2", "Synthetic milestone", "Updates", "Initial update", "Initial update\nFollow-up", "Web UI", "test"]);

    const roundTrip = await reload(await book.xlsx.writeBuffer());
    const t = roundTrip.getWorksheet("ProjectWBS")!;
    expect(t.getCell("D2").value).toBe(45);
    expect(t.getCell("E2").value).toBe("Initial update\nFollow-up");
    expect(t.getCell("D2").numFmt).toBe('0"%"');
    const h = roundTrip.getWorksheet("UpdateHistory")!;
    expect(h.getRow(1).values.slice(1)).toEqual(HEADERS);
    expect(h.getRow(2).values.slice(1)).toEqual(["historic", "2026-11-05T00:00:00.000Z", 501, "1.2", "Synthetic milestone", "Progress", "0", "20", "Web UI", "0.0-test"]);
    expect(h.getRow(3).values.slice(1)).toEqual([ID, WHEN, 501, "1.2", "Synthetic milestone", "Progress", "20", "45", "Web UI", "test"]);
    expect(h.getRow(4).values.slice(1)).toEqual([ID, WHEN, 501, "1.2", "Synthetic milestone", "Updates", "Initial update", "Initial update\nFollow-up", "Web UI", "test"]);
    expect(roundTrip.getWorksheet("Reference")!.getCell("A1").value).toBe("Do not discard this worksheet");
    expect(roundTrip.getWorksheet("Reference")!.getCell("A1").font.bold).toBe(true);
  });

  it("proves formula caches are not recalculated after an input changes (unsupported until addressed)", async () => {
    const book = await fixture();
    const sheet = book.getWorksheet("ProjectWBS")!;
    sheet.getCell("F2").value = { formula: "D2*2", result: 40 };
    sheet.getCell("D2").value = 45;
    const roundTrip = await reload(await book.xlsx.writeBuffer());
    expect(roundTrip.getWorksheet("ProjectWBS")!.getCell("F2").value)
      .toEqual({ formula: "D2*2", result: 40 });
  });

  it("proves an unknown related OOXML part disappears (must be rejected by preflight)", async () => {
    const inputZip = await JSZip.loadAsync(await (await fixture()).xlsx.writeBuffer());
    inputZip.file("customXml/item1.xml", '<sample xmlns="urn:spt:wbs:test">keep</sample>');
    const types = await inputZip.file("[Content_Types].xml")!.async("string");
    inputZip.file("[Content_Types].xml", types.replace("</Types>", '<Override PartName="/customXml/item1.xml" ContentType="application/xml"/></Types>'));
    const rels = await inputZip.file("_rels/.rels")!.async("string");
    inputZip.file("_rels/.rels", rels.replace("</Relationships>", '<Relationship Id="rIdSyntheticCustom" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml" Target="customXml/item1.xml"/></Relationships>'));
    const input = await inputZip.generateAsync({ type: "uint8array" });
    expect((await JSZip.loadAsync(input)).file("customXml/item1.xml")).not.toBeNull();
    const output = await JSZip.loadAsync(await (await reload(input)).xlsx.writeBuffer());
    expect(output.file("customXml/item1.xml")).toBeNull();
  });
});
