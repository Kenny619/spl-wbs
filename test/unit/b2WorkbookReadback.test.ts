import ExcelJS from "exceljs";
import {describe,it,expect} from "vitest";
import {verifyB2WorkbookReadback} from "../../src/managed/b2WorkbookReadback";
import {planB2TaskCreateAudit,type B2CreateField} from "../../src/managed/b2CreateAuditPlan";
import {encodeCreateManifest,MANIFEST_FIELD} from "../../src/managed/b2ContinuityProof";
import {HISTORY_COLUMNS} from "../../src/managed/workbookCandidate";
const id="11111111-1111-4111-8111-111111111111",stamp="2026-11-20T00:00:00.000Z";
const uuid=(n:number)=>"aaaaaaaa-aaaa-4aaa-8aaa-"+String(n).padStart(12,"0");
const audit=["EventID","ChangeSetID","TimestampUTC","EntityType","EntityID","TaskID","Action","Field","OldValue","NewValue","ActorLabel","ActorProvenance","Source","AppVersion"] as const;
const fields:B2CreateField[]=["ID","Title","WBSCode","TaskType","Progress"];
async function reopen(book:ExcelJS.Workbook){
 const b=new ExcelJS.Workbook();
 await b.xlsx.load(await book.xlsx.writeBuffer());return b;
}
async function fixture(){
 const original=new ExcelJS.Workbook();
 original.addWorksheet("ProjectWBS").addRow(fields);
 original.getWorksheet("ProjectWBS")!.addRow(["501","Legacy","1","Task",0]);
 original.addWorksheet("ProjectAudit").addRow(audit);
 original.addWorksheet("UpdateHistory").addRow(HISTORY_COLUMNS);
 original.getWorksheet("UpdateHistory")!.addRow([uuid(90),stamp,"501","1","Legacy","Progress",null,0,"Web UI","test"]);
 const candidate=await reopen(original);
 const values={ID:id,Title:"New",WBSCode:"2",TaskType:"Task",Progress:0};
 const p=planB2TaskCreateAudit({taskId:id,changeSetId:uuid(91),timestampUTC:stamp,actorLabel:"PM",appVersion:"test",fields,values,eventIds:fields.map((_,i)=>uuid(i+1))});
 if(!p.ok)throw Error(p.errors.join(","));
 const group=[...p.rows,{...p.rows[0],EventID:uuid(50),Field:MANIFEST_FIELD,NewValue:encodeCreateManifest(fields,1)}];
 for(const row of group)candidate.getWorksheet("ProjectAudit")!.addRow(audit.map(f=>row[f]));
 candidate.getWorksheet("ProjectWBS")!.addRow([id,"New","2","Task",0.25]);
 candidate.getWorksheet("ProjectWBS")!.getCell("E3").numFmt="0%";
 candidate.getWorksheet("UpdateHistory")!.addRow([uuid(92),stamp,id,"2","New","Progress",0,25,"Web UI","test"]);
 return {original,candidate};
}
describe("physical B2 workbook readback proof",()=>{
 it("reopens actual workbook and preserves typed legacy history and progress",async()=>{
  const {original,candidate}=await fixture();
  expect(verifyB2WorkbookReadback(await reopen(original),await reopen(candidate))).toEqual({ok:true,errors:[]});
 });
 it("rejects stringified numeric history prefix",async()=>{
  const {original,candidate}=await fixture();candidate.getWorksheet("UpdateHistory")!.getCell("H2").value="0";
  expect(verifyB2WorkbookReadback(original,await reopen(candidate))).toMatchObject({ok:false,errors:["prefix-changed:UpdateHistory"]});
 });
 it("rejects physical formula cells even with numeric caches",async()=>{
  const {original,candidate}=await fixture();candidate.getWorksheet("ProjectWBS")!.getCell("E3").value={formula:"1/4",result:0.25};
  expect(verifyB2WorkbookReadback(original,await reopen(candidate)).ok).toBe(false);
 });
 it("rejects a missing column from creation coverage",async()=>{
  const {original,candidate}=await fixture();candidate.getWorksheet("ProjectWBS")!.getCell("F1").value="Description";
  expect(verifyB2WorkbookReadback(original,await reopen(candidate))).toMatchObject({ok:false,errors:["incomplete-create-coverage"]});
 });
 it("rejects duplicate workbook task identity",async()=>{
  const {original,candidate}=await fixture();candidate.getWorksheet("ProjectWBS")!.addRow([id.toUpperCase(),"Duplicate","3","Task",0]);
  expect(verifyB2WorkbookReadback(original,await reopen(candidate)).ok).toBe(false);
 });
 it("rejects a new task without a matching Create record",async()=>{
  const {original,candidate}=await fixture();candidate.getWorksheet("ProjectWBS")!.addRow([uuid(200),"Unaudited","3","Task",0]);
  expect(verifyB2WorkbookReadback(original,await reopen(candidate))).toMatchObject({ok:false,errors:["untracked-new-task"]});
 });
 it("rejects disappearance of an original task",async()=>{
  const {original,candidate}=await fixture();candidate.getWorksheet("ProjectWBS")!.spliceRows(2,1);
  expect(verifyB2WorkbookReadback(original,await reopen(candidate))).toMatchObject({ok:false,errors:["missing-original-task"]});
 });
});
