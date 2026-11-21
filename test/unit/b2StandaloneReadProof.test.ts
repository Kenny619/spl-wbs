import ExcelJS from "exceljs";
import {describe,it,expect} from "vitest";
import {preparePopulatedProjectProof} from "../../src/managed/populatedProjectProof";
import {prepareExistingEntityProof} from "../../src/managed/existingEntityProof";
import {inspectStandaloneInitialB2Proof} from "../../src/managed/b2StandaloneReadProof";
import {projectDataWorkbook} from "../fixtures/projectDataWorkbook";
const id=(n:number)=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
const project={projectId:id(1),projectName:"Standalone fictional project",
 changeSetId:id(2),timestampUTC:"2026-11-21T00:00:00.000Z",actorLabel:"Synthetic PM",appVersion:"test"};
async function template(){
 return preparePopulatedProjectProof({project,route:"template",templateId:"simple-project",createChangeSetId:id(3)});
}
async function mutate(bytes:Uint8Array,callback:(b:ExcelJS.Workbook)=>void){
 const b=new ExcelJS.Workbook();
 await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
 callback(b);return new Uint8Array(await b.xlsx.writeBuffer());
}
describe("single initial B2 transaction: synthetic standalone read-only proof",()=>{
 it("reopens a template with complete creation history without a stored predecessor",async()=>{
  const data=await template(),copy=data.bytes.slice();
  const result=await inspectStandaloneInitialB2Proof(data.bytes);
  expect(result).toMatchObject({kind:"verified-synthetic-read",projectName:project.projectName,
   taskCount:3,createCount:3,createAuditRows:57,logicalTransactionCount:1,canWrite:false,canActivate:false});
  expect(result.history.flatMap(x=>x.entries).filter(x=>x.kind==="create")).toHaveLength(3);
  expect(data.bytes).toEqual(copy);
 });
 it("can reconstruct the pre-create prefix of an existing 0.1.2 project",async()=>{
  const source=new Uint8Array(await projectDataWorkbook());
  const candidate=await prepareExistingEntityProof({source,
   draft:{title:"New project item",taskType:"Task"},taskId:id(15),changeSetId:id(16),
   timestampUTC:project.timestampUTC,actorLabel:"Synthetic PM",appVersion:"test"});
  const result=await inspectStandaloneInitialB2Proof(candidate.bytes);
  expect(result).toMatchObject({kind:"verified-synthetic-read",taskCount:2,
   createCount:1,logicalTransactionCount:1,canWrite:false});
 });
 it("refuses missing initial task manifest",async()=>{
  const candidate=await template();
  const damaged=await mutate(candidate.bytes,book=>{
   const audit=book.getWorksheet("ProjectAudit")!;
   for(let i=2;i<=audit.rowCount;i++)
    if(audit.getRow(i).getCell(8).value==="__TaskCreateManifestV1"){
     audit.getRow(i).getCell(8).value="Title";break;
    }
  });
  await expect(inspectStandaloneInitialB2Proof(damaged)).rejects.toThrow();
 });
 it("refuses a fabricated schema downgrade",async()=>{
  const candidate=await template();
  const bad=await mutate(candidate.bytes,book=>{
   book.getWorksheet("ProjectMeta")!.eachRow(row=>{
    if(row.getCell(1).value==="ProjectDataSchemaVersion")row.getCell(2).value="0.1.2";
   });
  });
  await expect(inspectStandaloneInitialB2Proof(bad)).rejects.toThrow("expected-0.1.3-candidate");
 });
 it("refuses subsequent edits instead of inventing unsupported source chronology",async()=>{
  const candidate=await template();
  const bad=await mutate(candidate.bytes,book=>{
   book.getWorksheet("UpdateHistory")!.addRow([id(20),project.timestampUTC,id(21),
    "1","Changed","Title","Old","Changed","Web UI","test"]);
  });
  await expect(inspectStandaloneInitialB2Proof(bad)).rejects.toThrow("unsupported-post-create-edit");
 });
});
