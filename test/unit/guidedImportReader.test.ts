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
  expect(p.normalized.review.filter(entry => entry.row === 4)).toEqual([
   {row:4,field:"ID",reason:"generated",value:ids[4]},
   {row:4,field:"WBSCode",reason:"generated",value:"2"},
   {row:4,field:"TaskStatus",reason:"defaulted",value:"Not Started"},
   {row:4,field:"TaskType",reason:"defaulted",value:"Task"},
  ]);
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
 it("accounts for explicit exclusions without losing source rows or sheet provenance", async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Plan");
  sheet.addRow(["Title", "ID", "WBS", "Predecessors", "Source notes"]);
  sheet.addRow(["Delivery", "old-parent", "1", null, "Keep in source"]);
  sheet.addRow(["Prepare", "old-first", "1.1"]);
  sheet.addRow(["Finish", "old-last", "1.2", "old-first", "Review before omission"]);
  book.addWorksheet("Reference notes").addRow(["Outside selected source"]);
  const input = await bytes(book);
  const original = input.slice();
  const grid = await readGuidedSource(input, "Plan");
  if (grid.kind !== "grid") throw new Error("Expected selected worksheet");
  expect(prepareGuidedPreview(grid, {}).corePreviewValid).toBe(false);
  const preview = prepareGuidedPreview(grid, {}, [{column:4,field:null}]);
  expect(preview).toMatchObject({
   corePreviewValid:true, persistenceReady:false, sourceSheet:"Plan",
   otherSheets:["Reference notes"], sourceItemCount:3,
  });
  expect(preview.mapping.excludedCells).toEqual([
   {row:2,column:4,header:"Source notes"}, {row:4,column:4,header:"Source notes"},
  ]);
  expect(preview.normalized.drafts[2]).toMatchObject({
   id:"old-last", parentId:"old-parent", predecessorIds:["old-first"],
  });
  expect(preview.normalized.review).toEqual(expect.arrayContaining([
   {row:2,field:"TaskType",reason:"inferred",value:"Summary"},
   {row:4,field:"ParentTaskID",reason:"inferred",value:"old-parent"},
  ]));
  expect(input).toEqual(original);
 });
 it("rejects an empty import and numeric ownership instead of creating a partial preview", async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Plan");
  sheet.addRow(["Title", "Owner"]);
  const empty = await readGuidedSource(await bytes(book));
  if (empty.kind !== "grid") throw new Error("Expected worksheet");
  expect(prepareGuidedPreview(empty, {}).corePreviewValid).toBe(false);

  sheet.addRow(["Prepare", 301]);
  const populated = await readGuidedSource(await bytes(book));
  if (populated.kind !== "grid") throw new Error("Expected worksheet");
  expect(prepareGuidedPreview(populated, ids).normalized.issues).toContainEqual({
   row:2, field:"AssignedTo", code:"invalid-text",
  });
 });
 it("generates reviewed hierarchical WBS codes from explicit source IDs when no WBS column exists", async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Plan");
  sheet.addRow(["Title", "ID", "Parent ID", "Predecessors"]);
  sheet.addRow(["Prepare", "first", "root"]);
  sheet.addRow(["Independent", "other"]);
  sheet.addRow(["Delivery", "root"]);
  sheet.addRow(["Finish", "last", "root", "first"]);
  const grid = await readGuidedSource(await bytes(book));
  if (grid.kind !== "grid") throw new Error("Expected worksheet");
  const preview = prepareGuidedPreview(grid, {});
  expect(preview.corePreviewValid).toBe(true);
  expect(preview.normalized.drafts.map(({id,wbsCode,parentId,predecessorIds}) =>
   [id, wbsCode, parentId, predecessorIds])).toEqual([
   ["first","2.1","root",[]], ["other","1",null,[]],
   ["root","2",null,[]], ["last","2.2","root",["first"]],
  ]);
  expect(preview.normalized.review).toContainEqual({row:2,field:"WBSCode",reason:"generated",value:"2.1"});

  sheet.getCell("D1").value = "Predecessor WBS";
  sheet.getCell("D5").value = "2.1";
  const missingSourceCodes = await readGuidedSource(await bytes(book));
  if (missingSourceCodes.kind !== "grid") throw new Error("Expected worksheet");
  expect(prepareGuidedPreview(missingSourceCodes, {}).normalized.issues).toContainEqual({
   row:5,field:"PredecessorWBS",code:"invalid-dependency",
  });
 });
});
