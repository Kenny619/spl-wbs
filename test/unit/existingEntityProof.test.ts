import ExcelJS from "exceljs";
import {describe,it,expect} from "vitest";
import {prepareExistingEntityProof} from "../../src/managed/existingEntityProof";
import {projectDataWorkbook} from "../fixtures/projectDataWorkbook";
import {buildManagedCandidate} from "../../src/managed/workbookCandidate";
const id=(n:number)=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
const stamp="2026-11-20T00:00:00.000Z";
function input(source:Uint8Array){
 let n=100;return {source,draft:{title:"New task",taskType:"Task" as const},taskId:id(1),changeSetId:id(2),
 timestampUTC:stamp,actorLabel:"Synthetic PM",appVersion:"test",generateEventId:()=>id(++n)};
}
async function fixture(){
 const b=new ExcelJS.Workbook();await b.xlsx.load(new Uint8Array(await projectDataWorkbook()) as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
 const wbs=b.getWorksheet("ProjectWBS")!;wbs.getCell("K1").value="PredecessorIDs";
 return new Uint8Array(await b.xlsx.writeBuffer());
}
describe("synthetic existing-project creation candidate",()=>{
 it("creates exactly one entity without rewriting prior WBS or Watch records",async()=>{
  const source=await fixture(),original=source.slice();
  const req=input(source);
  const p=await prepareExistingEntityProof({...req,draft:{...req.draft,predecessorIds:["501"]}});
  expect(p).toMatchObject({taskCount:2,taskAuditRows:12,schemaVersion:"0.1.3",persistenceReady:false});
  expect(source).toEqual(original);
  const after=new ExcelJS.Workbook();await after.xlsx.load(p.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  expect(after.getWorksheet("ProjectWBS")!.getCell("A2").value).toBe(501);
  expect(after.getWorksheet("ProjectWBS")!.getCell("K3").value).toBe("501");
  expect(after.getWorksheet("ProjectAudit")!.getRow(3).values).toEqual(expect.arrayContaining(["ProjectDataSchemaVersion","0.1.2","0.1.3",req.changeSetId]));
  await expect(buildManagedCandidate({source:p.bytes,taskId:p.taskId,changes:{Title:"Not authorized"},appVersion:"test"})).rejects.toMatchObject({code:"UNSUPPORTED_PROJECT_DATA_VERSION"});
 });
 it("refuses incompatible metadata, invalid parent and absent requested fields",async()=>{
  const source=await fixture(),req=input(source);
  await expect(prepareExistingEntityProof({...req,draft:{...req.draft,parentId:"501"}})).rejects.toThrow("Parent must be a Summary");
  await expect(prepareExistingEntityProof({...req,draft:{...req.draft,workstream:"Absent column"}})).rejects.toThrow("requested-field-absent:Workstream");
  const bad=new Uint8Array(await projectDataWorkbook("malformed"));
  await expect(prepareExistingEntityProof(input(bad))).rejects.toThrow("unsupported-source-project");
 });
 it("refuses an existing historical transaction identity",async()=>{
  const req=input(await fixture());
  await expect(prepareExistingEntityProof({...req,changeSetId:"c6dbf481-6868-48b7-b9b5-8726be2e2561"})).rejects.toThrow("reused-change-set");
 });
 it("creates with accepted legacy header aliases without rewriting the header or adding columns",async()=>{
   const b=new ExcelJS.Workbook();
   await b.xlsx.load(await fixture() as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
   const w=b.getWorksheet("ProjectWBS")!;
   w.getCell("B1").value="Task name";w.getCell("C1").value="WBS";w.getCell("D1").value="Type";
   w.getCell("E1").value="Done";w.getCell("F1").value="Status";w.getCell("G1").value="Owner";
   w.getCell("I1").value="Start";w.getCell("J1").value="Finish";
   const headers=w.getRow(1).values;
   const p=await prepareExistingEntityProof(input(new Uint8Array(await b.xlsx.writeBuffer())));
   const after=new ExcelJS.Workbook();
   await after.xlsx.load(p.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
   expect(after.getWorksheet("ProjectWBS")!.getRow(1).values).toEqual(headers);
   expect(after.getWorksheet("ProjectWBS")!.columnCount).toBe(11);
   expect(after.getWorksheet("ProjectWBS")!.getCell("B3").value).toBe("New task");
   const fields=after.getWorksheet("ProjectAudit")!.getColumn(8).values;
   expect(fields).toEqual(expect.arrayContaining(["Title","WBSCode","TaskType","Progress","AssignedTo"]));
   expect(fields).not.toContain("Task name");
 });
 it("refuses ambiguous aliases and unexpected populated columns before candidate creation",async()=>{
   const b=new ExcelJS.Workbook();
   await b.xlsx.load(await fixture() as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
   const w=b.getWorksheet("ProjectWBS")!;
   w.getCell("L1").value="Task name";
   await expect(prepareExistingEntityProof(input(new Uint8Array(await b.xlsx.writeBuffer())))).rejects.toThrow("invalid-source-wbs");
   w.getCell("L1").value="Unrecognized business field";w.getCell("L2").value="Retain";
   await expect(prepareExistingEntityProof(input(new Uint8Array(await b.xlsx.writeBuffer())))).rejects.toThrow("unsupported-header");
 });
});
