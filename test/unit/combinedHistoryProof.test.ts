import ExcelJS from "exceljs";
import {describe,it,expect} from "vitest";
import {prepareBlankProject} from "../../src/managed/blankProjectCandidate";
import {preparePopulatedProjectProof} from "../../src/managed/populatedProjectProof";
import {prepareCombinedHistoryProof,buildCombinedHistoryReport} from "../../src/managed/combinedHistoryProof";
const id=(n:number)=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
const timestampUTC="2026-11-20T00:00:00.000Z";
const project={projectId:id(1),projectName:"Synthetic project",changeSetId:id(2),timestampUTC,actorLabel:"Synthetic PM",appVersion:"test"};
async function fixture(){
 // One original blank candidate is shared as the verified predecessor.
 // Its project initialization event IDs are generated internally. Reuse
 // the exact initialized audit prefix from the actual candidate rather than
 // regenerate independently with random IDs.
 let task=10,event=100;
 const p=await preparePopulatedProjectProof({project,createChangeSetId:id(3),route:"template",templateId:"simple-project",
   generateTaskId:()=>id(++task),generateEventId:()=>id(++event)});
 const blank=await prepareBlankProject(project);
 const a=new ExcelJS.Workbook(),b=new ExcelJS.Workbook();
 await a.xlsx.load(blank.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
 await b.xlsx.load(p.bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
 for(let i=2;i<=4;i++)a.getWorksheet("ProjectAudit")!.getRow(i).values=b.getWorksheet("ProjectAudit")!.getRow(i).values;
 return {before:new Uint8Array(await a.xlsx.writeBuffer()),candidate:b};
}
describe("combined B2 history and report proof",()=>{
 it("groups each creation once, preserves fields, counts one batch transaction",async()=>{
  const {before,candidate}=await fixture();
  const events=await prepareCombinedHistoryProof(before,new Uint8Array(await candidate.xlsx.writeBuffer()));
  expect(events).toHaveLength(1);expect(events[0].entries).toHaveLength(3);
  const report=buildCombinedHistoryReport(events,"2026-11-20","2026-11-20","Asia/Tokyo");
  expect(report).toMatchObject({creations:3,edits:0,logicalSaves:1,distinctTasks:3,fieldRows:54});
  expect(report.days[0].instants[0].crossSourceTie).toBe(false);
 });
 it("keeps same-time edit history separate without inventing cross-sheet ordering",async()=>{
  const {before,candidate}=await fixture();
  candidate.getWorksheet("ProjectWBS")!.getCell("B3").value="Revised scope";
  candidate.getWorksheet("UpdateHistory")!.addRow([id(4),timestampUTC,id(12),"1.1","Revised scope","Title","Confirm scope","Revised scope","Web UI","test"]);
  const events=await prepareCombinedHistoryProof(before,new Uint8Array(await candidate.xlsx.writeBuffer()));
  expect(events[0].crossSourceTie).toBe(true);
  const report=buildCombinedHistoryReport(events,"2026-11-20","2026-11-20","Asia/Tokyo");
  expect(report).toMatchObject({creations:3,edits:1,logicalSaves:2,distinctTasks:3,fieldRows:55});
  expect(events[0].entries).toEqual(expect.arrayContaining([expect.objectContaining({kind:"create",taskTitle:"Confirm scope"}),expect.objectContaining({kind:"edit"})]));
 });
 it("refuses tampered initial history",async()=>{
  const {before,candidate}=await fixture();
  candidate.getWorksheet("ProjectAudit")!.getCell("J2").value="Altered";
  await expect(prepareCombinedHistoryProof(before,new Uint8Array(await candidate.xlsx.writeBuffer()))).rejects.toThrow("invalid-b2-history");
 });
});
