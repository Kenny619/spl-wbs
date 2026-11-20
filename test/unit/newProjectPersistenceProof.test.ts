import {describe,it,expect} from "vitest";
import {sha256} from "../../src/managed/directSave";
import {simulateGuardedNewProjectSave,inspectNewProjectProof,type SyntheticExclusivePort} from "../../src/managed/newProjectPersistenceProof";
function memory(){
 const files=new Map<string,Uint8Array>();
 const port:SyntheticExclusivePort={
   async read(name){return files.get(name.toLowerCase())?.slice()??null;},
   async createExclusive(name,bytes){const key=name.toLowerCase();if(files.has(key))throw Error("occupied");files.set(key,bytes.slice());},
   async removeIfHash(name,hash){const key=name.toLowerCase(),bytes=files.get(key);if(!bytes||await sha256(bytes)!==hash)throw Error("changed");files.delete(key);},
 };
 return {files,port};
}
async function fixture(){
 const {files,port}=memory(),candidate=new Uint8Array([1,2,3]);
 const input={destinationName:"New project.xlsx",transactionId:"00000000-0000-4000-8000-000000000001",candidate,confirmedHash:await sha256(candidate)};
 return {files,port,input};
}
describe("synthetic guarded new-workbook save protocol",()=>{
 it("verifies final bytes and leaves no recovery residue",async()=>{
  const {port,files,input}=await fixture(),result=await simulateGuardedNewProjectSave(port,input);
  expect(result).toMatchObject({kind:"verified-synthetic-save",activationReady:false});
  expect([...files.keys()]).toEqual(["new project.xlsx"]);
  expect(files.get("new project.xlsx")).toEqual(input.candidate);
 });
 it("blocks existing names, case aliases, recovery files and unsafe filenames",async()=>{
  const {port,files,input}=await fixture();
  files.set("new project.xlsx",new Uint8Array([9]));
  await expect(simulateGuardedNewProjectSave(port,input)).rejects.toThrow("collision");
  expect(files.get("new project.xlsx")).toEqual(new Uint8Array([9]));
  files.clear();files.set("new project.backup.xlsx",new Uint8Array([7]));
  await expect(simulateGuardedNewProjectSave(port,input)).rejects.toThrow("collision");
  await expect(simulateGuardedNewProjectSave(port,{...input,destinationName:"CON.xlsx"})).rejects.toThrow("invalid-destination");
 });
 it("refuses altered confirmed bytes and cancellation without writing",async()=>{
  const {port,files,input}=await fixture();input.candidate[0]=8;
  await expect(simulateGuardedNewProjectSave(port,input)).rejects.toThrow("confirmed-candidate-changed");
  input.candidate[0]=1;
  await expect(simulateGuardedNewProjectSave(port,{...input,cancelled:()=>true})).rejects.toThrow("cancelled");
  expect(files.size).toBe(0);
 });
 it("preserves staging and receipt when another writer wins destination race",async()=>{
  const {port,files,input}=await fixture(),create=port.createExclusive;
  port.createExclusive=async(name,bytes)=>{
   if(name===input.destinationName)files.set(name.toLowerCase(),new Uint8Array([9]));
   await create(name,bytes);
  };
  await expect(simulateGuardedNewProjectSave(port,input)).rejects.toThrow("occupied");
  expect(files.get("new project.xlsx")).toEqual(new Uint8Array([9]));
  expect(files.has("new project.stage.xlsx")).toBe(true);
  expect(await inspectNewProjectProof(port,input.destinationName)).toMatchObject({kind:"stop"});
 });
 it("classifies an interrupted staged save and refuses automatic retry",async()=>{
  const {port,files,input}=await fixture(),create=port.createExclusive;
  port.createExclusive=async(name,bytes)=>{if(name===input.destinationName)throw Error("denied");await create(name,bytes);};
  await expect(simulateGuardedNewProjectSave(port,input)).rejects.toThrow("denied");
  expect(await inspectNewProjectProof(port,input.destinationName)).toMatchObject({kind:"staged-recovery"});
  expect(files.has("new project.xlsx")).toBe(false);
  await expect(simulateGuardedNewProjectSave(port,input)).rejects.toThrow("collision");
 });
 it("retains evidence when final readback mismatches",async()=>{
  const {port,files,input}=await fixture(),create=port.createExclusive;
  port.createExclusive=async(name,bytes)=>{await create(name,bytes);if(name===input.destinationName)files.set(name.toLowerCase(),new Uint8Array([0]));};
  await expect(simulateGuardedNewProjectSave(port,input)).rejects.toThrow("readback-mismatch");
  expect(files.has("new project.pending.json")).toBe(true);
  expect(files.has("new project.stage.xlsx")).toBe(true);
 });
});
