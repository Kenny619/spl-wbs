import {mkdtemp,rm,readdir,readFile,symlink,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {sha256} from "../../src/managed/directSave";
import {prepareBlankProject} from "../../src/managed/blankProjectCandidate";
import {inspectNewProjectDiskLab,proveExclusiveNewProjectDiskLab} from "../support/newProjectFilesystemLab";
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
 const input={directory,destinationName:"Fictional project.xlsx",
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
 it("rejects a symlink destination without changing its target",async()=>{
  const {directory,input}=await setup();
  const target=join(directory,"unrelated.txt");
  await writeFile(target,Buffer.from([2,4]));
  await symlink(target,join(directory,input.destinationName),"file");
  await expect(proveExclusiveNewProjectDiskLab(input)).rejects.toThrow("lab-collision");
  expect(await readFile(target)).toEqual(Buffer.from([2,4]));
 });
});
