import ExcelJS from "exceljs";
import { describe, it, expect } from "vitest";
import { readGuidedSource,prepareGuidedPreview } from "../../src/managed/guidedImportReader";
async function bytes(book:ExcelJS.Workbook){return new Uint8Array(await book.xlsx.writeBuffer());}
const ids={2:"11111111-1111-4111-8111-111111111111",4:"22222222-2222-4222-8222-222222222222"};
describe("guided XLSX source reader",()=>{
 it("reads actual minimal XLSX and accounts for blank rows without altering bytes",async()=>{
  const b=new ExcelJS.Workbook(), s=b.addWorksheet("Plan");
  s.addRow(["Task Name"]);s.addRow(["A"]);s.addRow([]);s.addRow(["B"]);
  const input=await bytes(b), copy=input.slice();
  const grid=await readGuidedSource(input);
  expect(grid.kind).toBe("grid");
  if(grid.kind!=="grid")return;
  const p=prepareGuidedPreview(grid,ids);
  expect(p.corePreviewValid).toBe(true);
  expect(p.sourceItemCount).toBe(2);
  expect(p.mapping.skippedBlankRows).toEqual([3]);
  expect(p.persistenceReady).toBe(false);
  expect(input).toEqual(copy);
 });
 it("requires worksheet selection and rejects unknown names",async()=>{
  const b=new ExcelJS.Workbook();b.addWorksheet("A");b.addWorksheet("B");
  const x=await bytes(b);
  expect(await readGuidedSource(x)).toEqual({kind:"choose-sheet",names:["A","B"]});
  expect((await readGuidedSource(x,"C")).kind).toBe("rejected");
  expect((await readGuidedSource(x,"B")).kind).toBe("grid");
 });
 it("routes managed history workbooks away from conversion",async()=>{
  const b=new ExcelJS.Workbook();b.addWorksheet("ProjectWBS");b.addWorksheet("UpdateHistory");
  expect(await readGuidedSource(await bytes(b),"ProjectWBS")).toEqual({kind:"native-workbook"});
 });
 it("detects trailing populated cells beyond the named headers",async()=>{
  const b=new ExcelJS.Workbook(),s=b.addWorksheet("Plan");
  s.addRow(["Title"]);s.addRow(["A",null,"unmapped"]);
  const g=await readGuidedSource(await bytes(b));
  expect(g.kind).toBe("grid");if(g.kind!=="grid")return;
  const p=prepareGuidedPreview(g,ids);
  expect(p.corePreviewValid).toBe(false);
  expect(p.mapping.issues).toContainEqual({code:"unmapped-data",row:2,columns:[2]});
 });
 it("does not discard a formula-only row or execute a formula",async()=>{
  const b=new ExcelJS.Workbook(),s=b.addWorksheet("Plan");
  s.addRow(["Title"]);s.getCell("A2").value={formula:"1+1"};
  const g=await readGuidedSource(await bytes(b));
  expect(g.kind).toBe("grid");if(g.kind!=="grid")return;
  const p=prepareGuidedPreview(g,ids);
  expect(p.sourceItemCount).toBe(1);
  expect(p.corePreviewValid).toBe(false);
  expect(g.issues).toContainEqual({code:"formula-review-required",row:2,column:1});
 });
 it("preserves numeric percent format in actual spreadsheet",async()=>{
  const b=new ExcelJS.Workbook(),s=b.addWorksheet("Plan");
  s.addRow(["Title","Progress"]);s.addRow(["A",0.25]);s.getCell("B2").numFmt="0%";
  const g=await readGuidedSource(await bytes(b));
  expect(g.kind).toBe("grid");if(g.kind!=="grid")return;
  const p=prepareGuidedPreview(g,ids);
  expect(p.corePreviewValid).toBe(true);
  expect(p.normalized.drafts[0].progress).toBe(25);
 });
 it("rejects unreadable bytes",async()=>{
  expect((await readGuidedSource(new Uint8Array([1,2,3]))).kind).toBe("rejected");
 });
});
