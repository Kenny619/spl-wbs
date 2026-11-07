import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { preflightManagedWorkbook } from "../../src/managed/preflight";

/** Stage A synthetic negative fixtures only. These do not prove raw central-directory duplicate handling. */
async function base(): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  book.addWorksheet("ProjectWBS").addRow(["ID", "Title"]);
  return new Uint8Array(await book.xlsx.writeBuffer());
}

async function mutate(transform: (zip: JSZip) => Promise<void> | void): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(await base());
  await transform(zip);
  return zip.generateAsync({ type: "uint8array" });
}

async function rejected(bytes: Uint8Array): Promise<void> {
  const before = Uint8Array.from(bytes);
  await expect(preflightManagedWorkbook(bytes)).rejects.toMatchObject({
    code: "UNSUPPORTED_PACKAGE",
  });
  expect(bytes).toEqual(before);
}

describe("Stage A ZIP-name and XML fail-closed negative probes", () => {
  it("rejects a case-colliding worksheet package entry", async () => {
    await rejected(await mutate(async zip => {
      const xml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      zip.file("xl/worksheets/Sheet1.xml", xml);
    }));
  });

  it("rejects a dot-segment worksheet alias", async () => {
    await rejected(await mutate(async zip => {
      const xml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
      zip.file("xl/worksheets/./shadow.xml", xml, { createFolders: false });
    }));
  });

  it("rejects XML entity escaping in a relationship target", async () => {
    await rejected(await mutate(async zip => {
      const path = "xl/_rels/workbook.xml.rels";
      const xml = await zip.file(path)!.async("string");
      expect(xml).toContain('Target="worksheets/sheet1.xml"');
      zip.file(path, xml.replace('Target="worksheets/sheet1.xml"',
        'Target="worksheets/sheet&#49;.xml"'));
    }));
  });

  it("rejects an XML entity in a content-type PartName", async () => {
    await rejected(await mutate(async zip => {
      const path = "[Content_Types].xml";
      const xml = await zip.file(path)!.async("string");
      expect(xml).toContain('/xl/worksheets/sheet1.xml');
      zip.file(path, xml.replace('/xl/worksheets/sheet1.xml',
        '/xl/worksheets/sheet&#49;.xml'));
    }));
  });
});
