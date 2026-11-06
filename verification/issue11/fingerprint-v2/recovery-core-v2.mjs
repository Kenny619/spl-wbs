// Test-only File System Access API safety protocol; never import into production.
export const N = Object.freeze({src:'FS08-SOURCE.xlsx', candidate:'FS08-CANDIDATE.xlsx', stage:'FS08-SOURCE.stage.xlsx', backup:'FS08-SOURCE.backup.xlsx', owner:'FS08-SOURCE.backup-owner.json', tx:'FS08-SOURCE.pending.json'});
export const TEST_ID='spt-wbs-issue11-recovery-harness-v1';
// v2 test-only API: a verified fingerprint must be captured at initial load.
const te=new TextEncoder();
export function bytes(x){return x instanceof Uint8Array?x:te.encode(x)}
export async function digest(x){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(x)))).map(v=>v.toString(16).padStart(2,'0')).join('')}
export async function exists(dir,name){try{await dir.getFileHandle(name);return true}catch(e){if(e.name==='NotFoundError')return false;throw e}}
export async function read(dir,name){const h=await dir.getFileHandle(name);return new Uint8Array(await (await h.getFile()).arrayBuffer())}
export async function write(dir,name,data,{exclusive=false}={}){if(exclusive&&await exists(dir,name))throw Error('COLLISION: '+name);const h=await dir.getFileHandle(name,{create:true});const stream=await h.createWritable();await stream.write(bytes(data));await stream.close();const observed=await read(dir,name);if(await digest(observed)!==await digest(data))throw Error('READBACK_MISMATCH: '+name)}
export async function json(dir,name){return JSON.parse(new TextDecoder().decode(await read(dir,name)))}
async function verifyOriginalBackup(dir){if(!await exists(dir,N.backup)){
  if(await exists(dir,N.owner))throw Error('ORPHAN_OWNER_METADATA');return null;
}if(!await exists(dir,N.owner))throw Error('UNKNOWN_BACKUP_OWNERSHIP');
const own=await json(dir,N.owner);if(own.protocol!==TEST_ID||own.source!==N.src||typeof own.backupHash!=='string')throw Error('UNRECOGNIZED_BACKUP_OWNER');
if(await digest(await read(dir,N.backup))!==own.backupHash)throw Error('BACKUP_HASH_MISMATCH');return own;
}
export async function inspect(dir){
 const files={};for(const [key,filename] of Object.entries(N)){if(await exists(dir,filename)){const content=await read(dir,filename);files[key]={sha256:await digest(content),size:content.length}}}
 let status='READY',reason='No pending transaction';
 if(files.tx){
  status='STOP';reason='Unrecognized or unreadable pending transaction';
  try{const t=await json(dir,N.tx);const own=files.owner?await json(dir,N.owner):null;
   if(t.protocol===TEST_ID&&t.source===N.src&&/^[a-f0-9]{64}$/.test(t.before)&&/^[a-f0-9]{64}$/.test(t.after)&&files.stage?.sha256===t.before){
    const s=files.src?.sha256,b=files.backup?.sha256;
    const knownBackup=(!files.backup&&!own)|| (own?.protocol===TEST_ID&&own.source===N.src&&b===own.backupHash);
    if(s===t.before&&knownBackup){status='BEFORE_WRITE';reason='Predecessor intact, stage verified; manual abort/restart review required';}
    else if(s===t.after&&b===t.before){status='BACKUP_VERIFIED';reason='Source candidate and predecessor backup verified; manual cleanup review required';}
    else if(s===t.after&&knownBackup){status='NEEDS_BACKUP';reason='New source written, stage verified, backup not yet updated; do not auto-retry';}
    else {status='STOP';reason='Unexpected source or backup fingerprint; refuse automatic restoration';}
   }
  }catch(e){reason='Unreadable pending metadata: '+e.message}
 }else if(files.stage){status='STOP';reason='Orphan staging file; preserve for investigation'}
 else if(files.backup||files.owner){try{await verifyOriginalBackup(dir)}catch(e){status='STOP';reason=e.message}}
 return {status,reason,files};
}
export async function install(dir,source,candidate){const a=[];for await(const [name] of dir.entries())a.push(name);if(a.length)throw Error('NONEMPTY_FOLDER: choose a fresh disposable empty folder');
 if((await digest(source))===(await digest(candidate)))throw Error('CANDIDATE_NOT_DISTINCT');
 await write(dir,N.src,source,{exclusive:true});await write(dir,N.candidate,candidate,{exclusive:true});return {sourceHash:await digest(source),candidateHash:await digest(candidate)};
}
export async function captureLoadedFingerprint(dir){
 const state=await inspect(dir);
 if(state.status!=='READY')throw Error('LOAD_STOP_EXISTING_STATE: '+state.reason);
 if(!await exists(dir,N.src))throw Error('LOAD_SOURCE_MISSING');
 return Object.freeze({source:N.src,sha256:await digest(await read(dir,N.src))});
}
export async function saveTest(dir,{loadedFingerprint,fault='none',logger=()=>{}}={}){
 if(!loadedFingerprint||loadedFingerprint.source!==N.src||typeof loadedFingerprint.sha256!=='string'||!/^[a-f0-9]{64}$/.test(loadedFingerprint.sha256))throw Error('LOAD_FINGERPRINT_REQUIRED');
 const status=await inspect(dir);if(status.status!=='READY')throw Error('STOP_EXISTING_STATE: '+status.reason);
 for(const n of [N.src,N.candidate])if(!await exists(dir,n))throw Error('MISSING_FIXTURE: '+n);
 // Never create transaction files over an unknown collision.
 if(await exists(dir,N.stage)||await exists(dir,N.tx))throw Error('UNRECONCILED_TRANSACTION');
 const owner=await verifyOriginalBackup(dir);const original=await read(dir,N.src),candidate=await read(dir,N.candidate);
 const before=await digest(original),after=await digest(candidate);
 if(before!==loadedFingerprint.sha256)throw Error('STALE_LOADED_SOURCE');
 if(before===after)throw Error('NO_CHANGE');
 const tx={protocol:TEST_ID,source:N.src,before,after,priorBackup:owner?.backupHash||null};
 const interrupt=(at)=>{if(fault===at)throw Error('INJECTED_STOP_AT_'+at)};
 interrupt('before-stage');
 await write(dir,N.stage,original,{exclusive:true});logger('STAGE_READBACK_PASS '+before);interrupt('after-stage');
 await write(dir,N.tx,JSON.stringify(tx),{exclusive:true});interrupt('after-tx');
 // Late comparison; critical distinction from an initial load-only fingerprint.
 if(await digest(await read(dir,N.src))!==loadedFingerprint.sha256)throw Error('EXTERNAL_SOURCE_CHANGED');interrupt('before-source');
 await write(dir,N.src,candidate);logger('SOURCE_READBACK_PASS '+after);interrupt('after-source');
 // Don't overwrite any changed existing managed backup.
 if(owner&&await digest(await read(dir,N.backup))!==owner.backupHash)throw Error('BACKUP_CHANGED_DURING_SAVE');
 if(!owner&&await exists(dir,N.backup))throw Error('FOREIGN_BACKUP_INSERTED');
 interrupt('before-backup');
 await write(dir,N.backup,original);logger('BACKUP_READBACK_PASS '+before);interrupt('after-backup');
 await write(dir,N.owner,JSON.stringify({protocol:TEST_ID,source:N.src,backupHash:before}));interrupt('after-owner');
 // Terminal readbacks before cleanup. No claimed physical atomicity.
 if(await digest(await read(dir,N.src))!==after||await digest(await read(dir,N.backup))!==before)throw Error('TERMINAL_READBACK_MISMATCH');
 interrupt('before-cleanup');
 await dir.removeEntry(N.stage);await dir.removeEntry(N.tx);
 logger('SAVE_MODEL_SUCCESS');return {before,after,backup:before};
}
