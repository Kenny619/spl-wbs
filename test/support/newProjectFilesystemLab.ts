import {constants} from "node:fs";
import {open,readdir,lstat} from "node:fs/promises";
import {join} from "node:path";
import {managedFileNames,sha256} from "../../src/managed/directSave";

/** TEST-ONLY filesystem feasibility lab. This is intentionally NOT a
 * SyntheticExclusivePort and must never be wired to the managed app:
 * Node pathname APIs cannot guarantee atomic case-folded namespace claims,
 * pinned directory traversal or atomic compare-and-remove across processes.
 * A secure production localhost service needs stronger OS-specific facilities.
 */
const reject=(message:string):never=>{throw Error(message);};
const safeName=(fileName:string)=>{
 if(!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,119}\.xlsx$/i.test(fileName)||
   /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(fileName)||
   /[ .]\.xlsx$/i.test(fileName))return reject("invalid-lab-filename");
 return managedFileNames(fileName);
};
type Request={directory:string;destinationName:string;candidate:Uint8Array;
 confirmedHash:string;transactionId:string;abortBeforeWrite?:boolean;
 /** Test-only fault injection, not a user-level recovery API. */
 failAfter?:"receipt"|"stage"|"destination"};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH=/^[0-9a-f]{64}$/;
async function ensureDirectory(directory:string){
 const s=await lstat(directory);
 if(!s.isDirectory()||s.isSymbolicLink())reject("unsafe-lab-directory");
}
async function readPinnedFile(path:string){
 const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  const stat=await handle.stat();
  if(!stat.isFile()||stat.nlink!==1)reject("unsafe-lab-file");
  return new Uint8Array(await handle.readFile());
 }finally{await handle.close();}
}
async function writeExclusive(directory:string,name:string,content:Uint8Array){
 const handle=await open(join(directory,name),
  constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{
  const stat=await handle.stat();
  if(!stat.isFile()||stat.nlink!==1)reject("unsafe-new-lab-file");
  await handle.writeFile(content);
  await handle.sync();
 }finally{await handle.close();}
 const observed=await readPinnedFile(join(directory,name));
 if(await sha256(observed)!==await sha256(content))reject("lab-readback-mismatch");
}
/** Return a precise read-only status; never repair/retry/delete a transaction. */
export async function inspectNewProjectDiskLab(directory:string,destinationName:string){
 await ensureDirectory(directory);
 const names=safeName(destinationName);
 const files=await readdir(directory);
 const find=(name:string)=>files.find(file=>file.toLowerCase()===name.toLowerCase());
 const conflict=Object.values(names).map(name=>find(name)).filter((v):v is string=>Boolean(v));
 if(!conflict.length)return {kind:"empty" as const};
 if(find(names.backup)||find(names.owner))return {kind:"stop" as const,reason:"unknown-backup-state"};
 if(find(names.transaction)||find(names.stage))return {kind:"stop" as const,reason:"recovery-required"};
 return {kind:"occupied" as const};
}
/** Writes *only into a disposable test directory* using exact O_EXCL creates.
 * Keeps receipt and staging after success because an atomic verified cleanup
 * primitive is not available. Result explicitly prohibits active activation.
 * Caller must pre-validate the candidate workbook; hash alone is not schema QA.
 */
export async function proveExclusiveNewProjectDiskLab(input:Request){
 const {directory,destinationName,candidate,confirmedHash,transactionId}=input;
 const names=safeName(destinationName);
 if(!UUID.test(transactionId)||!HASH.test(confirmedHash))reject("invalid-lab-confirmation");
 const snapshot=candidate.slice();
 if(!snapshot.length||await sha256(snapshot)!==confirmedHash)reject("changed-lab-candidate");
 if(input.abortBeforeWrite)reject("lab-cancelled-before-write");
 if((await inspectNewProjectDiskLab(directory,destinationName)).kind!=="empty")reject("lab-collision");
 // A second process can still win a case-folded name race on a POSIX FS;
 // final O_EXCL protects the exact destination, not that stronger promise.
 const receipt=new TextEncoder().encode(JSON.stringify({
  protocol:"spt-wbs-new-project-disk-lab-v1",destinationName,transactionId,candidateHash:confirmedHash,
 }));
 await writeExclusive(directory,names.transaction,receipt);
 if(input.failAfter==="receipt")return reject("lab-fault-after-receipt");
 await writeExclusive(directory,names.stage,snapshot);
 if(input.failAfter==="stage")return reject("lab-fault-after-stage");
 await writeExclusive(directory,names.source,snapshot);
 if(input.failAfter==="destination")return reject("lab-fault-after-destination");
 const observed=await readPinnedFile(join(directory,names.source));
 if(await sha256(observed)!==confirmedHash)reject("lab-final-verification-failed");
 return {kind:"verified-test-only" as const,destinationName,
  destinationHash:confirmedHash,activationReady:false as const,recoveryEvidenceRetained:true as const};
}
