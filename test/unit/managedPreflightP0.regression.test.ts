import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { preflightManagedWorkbook } from "../../src/managed/preflight";

async function workbook(): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("ProjectWBS");
  sheet.addRow(["ID", "Title", "WBSCode", "TaskType", "Progress"]);
  sheet.addRow([1, "Synthetic", "1", "Task", 10]);
  return new Uint8Array(await book.xlsx.writeBuffer());
}

async function mutateRels(transform: (xml: string) => string): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(await workbook());
  const path = "xl/_rels/workbook.xml.rels";
  const part = zip.file(path);
  if (!part) throw new Error("ExcelJS workbook relationships missing");
  zip.file(path, transform(await part.async("string")));
  return zip.generateAsync({ type: "uint8array" });
}

const bad = '<Relationship Id="rIdUnsupported" Type="urn:spt-wbs:unsupported" Target="worksheets/sheet1.xml"/>';
function append(xml: string, addition: string) {
  if (!xml.includes("</Relationships>")) throw new Error("Relationships root missing");
  return xml.replace("</Relationships>", addition + "</Relationships>");
}
async function rejectsWithoutMutation(source: Uint8Array, code = "UNSUPPORTED_PACKAGE") {
  const original = Uint8Array.from(source);
  await expect(preflightManagedWorkbook(source)).rejects.toMatchObject({ code });
  expect(source).toEqual(original);
}


async function mutateContentTypes(transform: (xml: string) => string): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(await workbook());
  const name = "[Content_Types].xml";
  const part = zip.file(name);
  if (!part) throw new Error("Missing content types");
  zip.file(name, transform(await part.async("string")));
  return zip.generateAsync({ type: "uint8array" });
}

describe("P0: fail closed on unsupported OOXML relationships", () => {

  it("rejects content-type declarations for unknown package parts", async () => {
    await rejectsWithoutMutation(await mutateContentTypes(xml => xml.replace(
      "</Types>", '<Override PartName="/customXml/item1.xml" ContentType="application/xml"/></Types>'
    )));
  });
  it("rejects missing required worksheet content-type declarations", async () => {
    await rejectsWithoutMutation(await mutateContentTypes(xml =>
      xml.replace(/<Override\s+[^>]*PartName="\/xl\/worksheets\/sheet1\.xml"[^>]*\/>/, "")
    ));
  });
  it("rejects an incorrect workbook content-type declaration", async () => {
    await rejectsWithoutMutation(await mutateContentTypes(xml =>
      xml.replace("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml")
    ));
  });
  it("rejects a relationship whose worksheet target does not exist", async () => {
    await rejectsWithoutMutation(await mutateRels(xml =>
      xml.replace('Target="worksheets/sheet1.xml"', 'Target="worksheets/sheet999.xml"')
    ));
  });
  it("rejects a worksheet relationship targeting the workbook itself", async () => {
    await rejectsWithoutMutation(await mutateRels(xml =>
      xml.replace('Target="worksheets/sheet1.xml"', 'Target="workbook.xml"')
    ));
  });
  it("rejects a relationship whose type does not agree with its target part", async () => {
    const worksheet = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
    const styles = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
    await rejectsWithoutMutation(await mutateRels(xml =>
      xml.replace('Type="' + worksheet + '"', 'Type="' + styles + '"')
    ));
  });
  it("accepts an ordinary ExcelJS workbook", async () => {
    await expect(preflightManagedWorkbook(await workbook())).resolves.toBeUndefined();
  });
  it("rejects self-closing unknown type", async () => {
    await rejectsWithoutMutation(await mutateRels(xml => append(xml, bad)));
  });
  it("rejects a prefixed unsupported relationship instead of skipping it", async () => {
    await rejectsWithoutMutation(await mutateRels(xml => append(
      xml.replace("<Relationships ", '<Relationships xmlns:p="http://schemas.openxmlformats.org/package/2006/relationships" '),
      bad.replace("<Relationship ", "<p:Relationship "),
    )));
  });
  it("rejects explicit closing tags instead of skipping them", async () => {
    await rejectsWithoutMutation(await mutateRels(xml => append(xml, bad.replace("/>", "></Relationship>"))));
  });
  it("rejects unknown internal relationship types", async () => {
    await rejectsWithoutMutation(await mutateRels(xml => append(xml, bad)));
  });
  it("rejects external relationships", async () => {
    const standard = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
    await rejectsWithoutMutation(await mutateRels(xml => append(xml,
      bad.replace("urn:spt-wbs:unsupported", standard).replace(
        'Target="worksheets/sheet1.xml"', 'Target="https://example.invalid/" TargetMode="External"'
      )
    )), "EXTERNAL_RELATIONSHIP");
  });
  it("rejects malformed relationship XML", async () => {
    await rejectsWithoutMutation(await mutateRels(xml => append(xml, '<Relationship Id="unfinished"')));
  });
  it("rejects missing Type attribute", async () => {
    await rejectsWithoutMutation(await mutateRels(xml => append(
      xml, '<Relationship Id="rIdMissingType" Target="worksheets/sheet1.xml"/>'
    )));
  });
  it("rejects unrecognized relationship attributes", async () => {
    const standard = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
    await rejectsWithoutMutation(await mutateRels(xml => append(xml,
      bad.replace("urn:spt-wbs:unsupported", standard)
        .replace("/>", ' CustomAttribute="unrecognized"/>')
    )));
  });
  it("rejects repeated Type attributes even when one is allowlisted", async () => {
    const standard = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
    await rejectsWithoutMutation(await mutateRels(xml => append(xml,
      bad.replace("urn:spt-wbs:unsupported", standard)
        .replace(' Target="', ' Type="urn:spt-wbs:other" Target="')
    )));
  });
  it("rejects relationship attributes with an unrecognized namespace prefix", async () => {
    const standard = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
    await rejectsWithoutMutation(await mutateRels(xml => append(xml,
      bad.replace("urn:spt-wbs:unsupported", standard)
        .replace("/>", ' custom:Flag="true"/>')
    )));
  });
  it("rejects unsafe relative internal paths", async () => {
    const standard = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
    await rejectsWithoutMutation(await mutateRels(xml => append(xml,
      bad.replace("urn:spt-wbs:unsupported", standard)
        .replace('worksheets/sheet1.xml', '../../outside.xml')
    )));
  });
  it("rejects duplicate relationship Id values", async () => {
    await rejectsWithoutMutation(await mutateRels(xml => {
      const first = /\bId="([^"]+)"/.exec(xml)?.[1];
      if (!first) throw new Error("No relationship ID found");
      return append(xml, bad.replace("rIdUnsupported", first));
    }));
  });
});
