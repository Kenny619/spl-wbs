import {sha256,managedFileNames} from "./directSave";

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const PROTOCOL="spt-wbs-new-project-proof-v1";
type Receipt=Readonly<{protocol:typeof PROTOCOL;transactionId:string;destinationName:string;candidateHash:string}>;
type Input={destinationName:string;transactionId:string;candidate:Uint8Array;confirmedHash:string;cancelled?:()=>boolean};
/** Test-only port. createExclusive MUST atomically refuse existing names,
 * including case aliases. removeIfHash MUST atomically compare and remove.
 * Browser FileSystemDirectoryHandle does not guarantee either capability.
 * No production implementation or binding to the managed app is authorized. */
export interface SyntheticExclusivePort{
 read(name:string):Promise<Uint8Array|null>;
 createExclusive(name:string,bytes:Uint8Array):Promise<void>;
 removeIfHash(name:string,expectedHash:string):Promise<void>;
}
type Result={kind:"verified-synthetic-save";destinationHash:string;destinationName:string;transactionId:string;activationReady:false};
const stop=(reason:string):never=>{throw Error(reason);};
function names(destinationName:string){
 // Deliberately conservative portable names for the synthetic contract.
 if(!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,119}\.xlsx$/i.test(destinationName) ||
   /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(destinationName) ||
   /[ .]\.xlsx$/i.test(destinationName))return stop("invalid-destination");
 return managedFileNames(destinationName);
}
const encoder=new TextEncoder();
async function hashAt(port:SyntheticExclusivePort,name:string){
 const bytes=await port.read(name);return bytes===null?null:sha256(bytes);
}
async function verifyAt(port:SyntheticExclusivePort,name:string,expected:string){
 if(await hashAt(port,name)!==expected)return stop("readback-mismatch:"+name);
}
export async function inspectNewProjectProof(port:SyntheticExclusivePort,destinationName:string){
 const n=names(destinationName);
 const [source,stage,pending,backup,owner]=await Promise.all([port.read(n.source),port.read(n.stage),port.read(n.transaction),port.read(n.backup),port.read(n.owner)]);
 if(backup!==null||owner!==null)return {kind:"stop" as const,reason:"existing-backup-state"};
 if(pending===null){
   if(stage!==null)return {kind:"stop" as const,reason:"unowned-stage"};
   return {kind:source===null?"empty" as const:"occupied" as const};
 }
 let receipt:Receipt;
 try{
   receipt=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(pending)) as Receipt;
   if(receipt===null||receipt.protocol!==PROTOCOL||receipt.destinationName!==destinationName||
      typeof receipt.transactionId!=="string"||!UUID.test(receipt.transactionId)||
      typeof receipt.candidateHash!=="string"||!HASH.test(receipt.candidateHash))throw Error("invalid-receipt");
 }catch{return {kind:"stop" as const,reason:"invalid-new-project-receipt"};}
 const [sourceHash,stageHash]=await Promise.all([source===null?null:sha256(source),stage===null?null:sha256(stage)]);
 if((sourceHash!==null&&sourceHash!==receipt.candidateHash)||(stageHash!==null&&stageHash!==receipt.candidateHash))
   return {kind:"stop" as const,reason:"unexpected-file-content"};
 if(sourceHash!==null)return {kind:"verified-destination-recovery" as const,receipt};
 if(stageHash!==null)return {kind:"staged-recovery" as const,receipt};
 return {kind:"receipt-only-recovery" as const,receipt};
}
/** Disposable transaction proof: snapshot the confirmed candidate, reserve
 * recovery receipt, stage, exclusively create destination, verify bytes and
 * remove only owned evidence. Any uncertain outcome retains recovery data.
 * No real filesystem adapter, UI activation, or automatic recovery is provided.
 * confirmedHash proves byte identity, not that a candidate is schema-valid;
 * caller must separately prove workbook contents before confirming. */
export async function simulateGuardedNewProjectSave(port:SyntheticExclusivePort,input:Input):Promise<Result>{
 const n=names(input.destinationName);
 if(!UUID.test(input.transactionId)||!HASH.test(input.confirmedHash))return stop("invalid-confirmation");
 const bytes=input.candidate.slice();
 if(!bytes.length||await sha256(bytes)!==input.confirmedHash)return stop("confirmed-candidate-changed");
 if(input.cancelled?.())return stop("cancelled-before-write");
 const state=await inspectNewProjectProof(port,input.destinationName);
 if(state.kind!=="empty")return stop("destination-or-recovery-collision");
 if(input.cancelled?.())return stop("cancelled-before-write");
 const receipt:Receipt={protocol:PROTOCOL,transactionId:input.transactionId,destinationName:n.source,candidateHash:input.confirmedHash};
 const receiptBytes=encoder.encode(JSON.stringify(receipt)),receiptHash=await sha256(receiptBytes);
 // After this point cancellation is not treated as a clean discard. Only an
 // explicit later recovery review may remove incomplete transaction evidence.
 await port.createExclusive(n.transaction,receiptBytes);
 await verifyAt(port,n.transaction,receiptHash);
 await port.createExclusive(n.stage,bytes.slice());
 await verifyAt(port,n.stage,input.confirmedHash);
 await port.createExclusive(n.source,bytes.slice());
 await verifyAt(port,n.source,input.confirmedHash);
 await verifyAt(port,n.transaction,receiptHash);
 await port.removeIfHash(n.stage,input.confirmedHash);
 await verifyAt(port,n.source,input.confirmedHash);
 await port.removeIfHash(n.transaction,receiptHash);
 await verifyAt(port,n.source,input.confirmedHash);
 return {kind:"verified-synthetic-save",destinationHash:input.confirmedHash,destinationName:n.source,transactionId:input.transactionId,activationReady:false};
}
