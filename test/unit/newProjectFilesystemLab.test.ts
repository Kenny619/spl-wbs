import {mkdtemp,rm,readdir,readFile,symlink,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {sha256} from "../../src/managed/directSave";
import {prepareBlankProject} from "../../src/managed/blankProjectCandidate";
import {preparePopulatedProjectProof} from "../../src/managed/populatedProjectProof";
import ExcelJS from "exceljs";
import {inspectNewProjectDiskLab,proveExclusiveNewProjectDiskLab} from "./support/newProjectFilesystemLab";
const dirs:string[]=[];
afterEach(async()=>{for(const d of dirs.splice(0))await rm(d,{recursive:true,force:true});});
async function setup(){
 const directory=await mkdtemp(join(tmpdir(),"spt-wbs-c24-proof-"));dirs.push(directory);
 const project={projectId:"00000000-0000-4000-8000-000000000001",
  projectName:"Fictional project",actorLabel:"Unverified tester",
  changeSetId:"00000000-0000-4000-8000-000000000002",
  timestampUTC:"2026-11-21T00:00:00.000Z",appVersion:"test"};
 const generated=await prepareBlankProject(project);
 const candidate=generated.bytes;
 const input={directory,destinationName:"Fictional project.xlsx",candidateMode:"blank-0.1.2" as const,
  transactionId:"00000000-0000-4000-8000-000000000003",
  candidate,confirmedHash:await sha256(candidate)};
 return {directory,input};
}
describe("test-only exclusive disk feasibility lab",()=>{
 it("exclusively creates candidate and retains identifiable transaction evidence",async()=>{
  const {directory,input}=await setup();
  const original=input.candidate.slice();
  const out=await proveExclusiveNewProjectDiskLab(input);
  expect(out).toMatchObject({kind:"verified-test-only",activationReady:false,recoveryEvidenceRetained:true});
  expect(await readFile(join(directory,input.destinationName))).toEqual(Buffer.from(original));
  expect(input.candidate).toEqual(original);
  expect((await readdir(directory)).sort()).toEqual([
   "Fictional project.pending.json","Fictional project.stage.xlsx","Fictional project.xlsx"].sort());
  expect(await inspectNewProjectDiskLab(directory,input.destinationName)).toEqual({kind:"stop",reason:"recovery-required"});
 });
 it("protects preexisting destination and case-variant names",async()=>{
  const {directory,input}=await setup();
  await writeFile(join(directory,input.destinationName),Buffer.from([7,8]));
  await expect(proveExclusiveNewProjectDiskLab(input)).rejects.toThrow("lab-collision");
  expect(await readFile(join(directory,input.destinationName))).toEqual(Buffer.from([7,8]));
  await rm(join(directory,input.destinationName));
  await writeFile(join(directory,"FICTIONAL PROJECT.xlsx"),Buffer.from([5]));
  await expect(proveExclusiveNewProjectDiskLab(input)).rejects.toThrow("lab-collision");
  expect(await readFile(join(directory,"FICTIONAL PROJECT.xlsx"))).toEqual(Buffer.from([5]));
 });
 it("refuses changed confirmations, invalid names, and cancellations without writing",async()=>{
  const {directory,input}=await setup();
  const corrupt=input.candidate.slice();corrupt[0]^=0xff;
  await expect(proveExclusiveNewProjectDiskLab({...input,candidate:corrupt})).rejects.toThrow("changed-lab-candidate");
  await expect(proveExclusiveNewProjectDiskLab({...input,destinationName:"CON.xlsx"})).rejects.toThrow("invalid-lab-filename");
  await expect(proveExclusiveNewProjectDiskLab({...input,abortBeforeWrite:true})).rejects.toThrow("lab-cancelled-before-write");
  expect(await readdir(directory)).toEqual([]);
 });
 it("keeps receipt/stage after fault and refuses an automatic replay",async()=>{
  const {directory,input}=await setup();
  await expect(proveExclusiveNewProjectDiskLab({...input,failAfter:"stage"})).rejects.toThrow("lab-fault-after-stage");
  expect(await inspectNewProjectDiskLab(directory,input.destinationName)).toEqual({kind:"stop",reason:"recovery-required"});
  await expect(proveExclusiveNewProjectDiskLab(input)).rejects.toThrow("lab-collision");
  expect((await readdir(directory)).sort()).toEqual(["Fictional project.pending.json","Fictional project.stage.xlsx"].sort());
 });
 it.skipIf(process.platform==="win32")("rejects a symlink destination without changing its target",async()=>{
  const {directory,input}=await setup();
  const target=join(directory,"unrelated.txt");
  await writeFile(target,Buffer.from([2,4]));
  await symlink(target,join(directory,input.destinationName),"file");
  await expect(proveExclusiveNewProjectDiskLab(input)).rejects.toThrow("lab-collision");
  expect(await readFile(target)).toEqual(Buffer.from([2,4]));
 });
 it("validates full populated 0.1.3 B2 audit against its exact predecessor before disk creation",async()=>{
  const {directory,input}=await setup();
  const template=await preparePopulatedProjectProof({
   project:{projectId:"00000000-0000-4000-8000-000000000011",
    projectName:"Synthetic delivery",actorLabel:"Synthetic tester",
    changeSetId:"00000000-0000-4000-8000-000000000012",
    timestampUTC:"2026-11-21T00:00:00.000Z",appVersion:"test"},
   route:"template",templateId:"simple-project",
   createChangeSetId:"00000000-0000-4000-8000-000000000013",
  });
  const populated={...input,destinationName:"Synthetic delivery.xlsx",
   candidate:template.bytes,confirmedHash:await sha256(template.bytes),
   candidateMode:"populated-0.1.3" as const,predecessor:template.predecessorBytes};
  const output=await proveExclusiveNewProjectDiskLab(populated);
  expect(output).toMatchObject({kind:"verified-test-only",activationReady:false});
  expect(await readFile(join(directory,populated.destinationName))).toEqual(Buffer.from(template.bytes));
 });
 it("rejects correctly checksummed invalid XLSX before opening any target",async()=>{
  const {directory,input}=await setup();
  const corrupt=new Uint8Array([1,2,3,4]);
  await expect(proveExclusiveNewProjectDiskLab({...input,candidate:corrupt,confirmedHash:await sha256(corrupt)})).rejects.toThrow();
  expect(await readdir(directory)).toEqual([]);
 });
 it("refuses an unsupported project version even with a fresh candidate hash",async()=>{
  const {directory,input}=await setup();
  const book=new ExcelJS.Workbook();
  await book.xlsx.load(input.candidate as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  const meta=book.getWorksheet("ProjectMeta")!;
  for(let i=2;i<=meta.rowCount;i++)if(meta.getRow(i).getCell(1).value==="ProjectDataSchemaVersion")
   meta.getRow(i).getCell(2).value="9.9.9";
  const candidate=new Uint8Array(await book.xlsx.writeBuffer());
  await expect(proveExclusiveNewProjectDiskLab({...input,candidate,confirmedHash:await sha256(candidate)}))
   .rejects.toThrow("lab-invalid-blank-project");
  expect(await readdir(directory)).toEqual([]);
 });
 it("requires an exact reviewed predecessor for populated B2 candidates",async()=>{
  const {directory,input}=await setup();
  await expect(proveExclusiveNewProjectDiskLab({...input,candidateMode:"populated-0.1.3"}))
   .rejects.toThrow("lab-missing-b2-predecessor");
  await expect(proveExclusiveNewProjectDiskLab({...input,candidateMode:"populated-0.1.3",
   predecessor:input.candidate})).rejects.toThrow("lab-invalid-b2-version");
  expect(await readdir(directory)).toEqual([]);
 });

});
