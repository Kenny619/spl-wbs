import ExcelJS from "exceljs";
import {describe,it,expect} from "vitest";
import {preparePopulatedProjectProof} from "../../src/managed/populatedProjectProof";
import {readGuidedSource,prepareGuidedPreview} from "../../src/managed/guidedImportReader";
import {buildManagedCandidate} from "../../src/managed/workbookCandidate";
const id=(n:number)=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
function input(){
 let n=100;
 return {project:{projectId:id(1),projectName:"Synthetic project",changeSetId:id(2),timestampUTC:"2026-11-20T00:00:00.000Z",actorLabel:"Synthetic PM",appVersion:"test"},
 createChangeSetId:id(3),generateEventId:()=>id(++n)};
}
describe("synthetic populated onboarding proof",()=>{
 it("constructs, serializes and reopens a starter template; accepted writer refuses it",async()=>{
   let n=10;
   const p=await preparePopulatedProjectProof({...input(),route:"template",templateId:"milestone-led-delivery",milestoneDate:"2026-12-01",generateTaskId:()=>id(++n)});
   expect(p).toMatchObject({taskCount:3,auditRows:57,schemaVersion:"0.1.3",persistenceReady:false});
   await expect(buildManagedCandidate({source:p.bytes,taskId:id(11),changes:{Title:"Do not save"},appVersion:"test"})).rejects.toMatchObject({code:"UNSUPPORTED_PROJECT_DATA_VERSION"});
 });
 it("constructs from a valid guided preview with remapped legacy task IDs and parent/dependency links",async()=>{
   const book=new ExcelJS.Workbook(),s=book.addWorksheet("Plan");
   s.addRow(["Title","ID","WBS","Predecessors"]);s.addRow(["Delivery","parent","1"]);s.addRow(["Prepare","first","1.1"]);s.addRow(["Finish","last","1.2","first"]);
   const source=new Uint8Array(await book.xlsx.writeBuffer()),original=source.slice();
   const grid=await readGuidedSource(source);
   if(grid.kind!=="grid")throw Error("Expected grid");
   const preview=prepareGuidedPreview(grid,{2:id(11),3:id(12),4:id(13)});
   const p=await preparePopulatedProjectProof({...input(),route:"import",preview});
   expect(p.taskCount).toBe(3);expect(source).toEqual(original);
   const reopened=new ExcelJS.Workbook();await reopened.xlsx.load(p.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
   expect(reopened.getWorksheet("ProjectWBS")!.getCell("E4").value).toBe(id(11));
   expect(reopened.getWorksheet("ProjectWBS")!.getCell("L4").value).toBe(id(12));
 });
 it("refuses invalid starter input and reused creation transactions",async()=>{
   await expect(preparePopulatedProjectProof({...input(),route:"template",templateId:"milestone-led-delivery"})).rejects.toThrow("Milestone requires a date");
   await expect(preparePopulatedProjectProof({...input(),createChangeSetId:id(2),route:"template",templateId:"simple-project"})).rejects.toThrow("empty-or-reused-create-transaction");
 });
});
