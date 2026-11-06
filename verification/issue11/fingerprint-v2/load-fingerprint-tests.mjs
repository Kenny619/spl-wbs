import {test} from 'node:test';
import assert from 'node:assert/strict';
import {install,saveTest,captureLoadedFingerprint,inspect,N,bytes,digest} from './recovery-core-v2.mjs';
const b=x=>Uint8Array.from(bytes(x));
class Dir{
 constructor(){this.m=new Map();this.onClose=null;}
 async getFileHandle(name,{create=false}={}){
  if(!this.m.has(name)){
   if(!create)throw Object.assign(new Error('Not found'),{name:'NotFoundError'});
   this.m.set(name,new Uint8Array());
  }
  const d=this;
  return {
   async getFile(){return {arrayBuffer:async()=>Uint8Array.from(d.m.get(name)).buffer}},
   async createWritable(){let next;
    return {async write(v){next=b(v)},async close(){if(d.onClose)await d.onClose(name,d);d.m.set(name,next)}};
   }
  };
 }
 async *entries(){for(const name of this.m.keys())yield[name,{}]}
 async removeEntry(name){this.m.delete(name)}
}
const source=b('PK - synthetic initial fixture 000'),candidate=b('PK - synthetic new fixture 000');
async function fresh(){const dir=new Dir();await install(dir,source,candidate);return dir}
async function logged(d){return captureLoadedFingerprint(d)}
test('SAFE: initial loaded fingerprint matches installed workbook',async()=>{
 const d=await fresh();const snap=await logged(d);
 assert.equal(snap.sha256,await digest(source));assert.equal(snap.source,N.src);assert.equal(Object.isFrozen(snap),true);
});
test('SAFE: loaded fingerprint is mandatory; missing or malformed input never stages a write',async()=>{
 const d=await fresh();
 for(const fingerprint of [undefined,{source:N.src,sha256:'invalid'},{source:'else.xlsx',sha256:await digest(source)}]){
  await assert.rejects(saveTest(d,{loadedFingerprint:fingerprint}),/LOAD_FINGERPRINT_REQUIRED/);
  assert.deepEqual(d.m.get(N.src),source);assert.equal(d.m.has(N.stage),false);
 }
});
test('SAFE: external edit after load but before Save is blocked, source retained, no backup or stage',async()=>{
 const d=await fresh();const snap=await logged(d);const external=b('PK - external edited file 000');d.m.set(N.src,external);
 await assert.rejects(saveTest(d,{loadedFingerprint:snap}),/STALE_LOADED_SOURCE/);
 assert.deepEqual(d.m.get(N.src),external);
 for(const k of [N.stage,N.tx,N.backup,N.owner])assert.equal(d.m.has(k),false);
});
test('SAFE: same-length external edit also detected by full SHA-256',async()=>{
 const d=await fresh();const snap=await logged(d);const external=b('PK - synthetic initial fixture 001');
 assert.equal(external.length,source.length);d.m.set(N.src,external);
 await assert.rejects(saveTest(d,{loadedFingerprint:snap}),/STALE_LOADED_SOURCE/);
 assert.deepEqual(d.m.get(N.src),external);
});
test('SAFE: external modification after transaction staging but before late comparison blocks source write',async()=>{
 const d=await fresh();const snap=await logged(d),external=b('PK - external during stage 000');
 d.onClose=(name,dir)=>{if(name===N.tx)dir.m.set(N.src,external)};
 await assert.rejects(saveTest(d,{loadedFingerprint:snap}),/EXTERNAL_SOURCE_CHANGED/);
 assert.deepEqual(d.m.get(N.src),external);
 assert.equal(d.m.has(N.stage),true);
 assert.equal((await inspect(d)).status,'STOP');
});
test('SAFE: explicit re-load after external change provides a new baseline',async()=>{
 const d=await fresh();const old=await logged(d);const external=b('PK - outside editor bytes');d.m.set(N.src,external);
 await assert.rejects(saveTest(d,{loadedFingerprint:old}),/STALE_LOADED_SOURCE/);
 const updated=await logged(d);assert.notEqual(updated.sha256,old.sha256);
 const result=await saveTest(d,{loadedFingerprint:updated});
 assert.equal(result.before,await digest(external));assert.equal(result.after,await digest(candidate));
 assert.equal(await digest(d.m.get(N.backup)),await digest(external));
});
test('SAFE: successful Save requires an explicitly refreshed load fingerprint for the next Save',async()=>{
 const d=await fresh();const first=await logged(d);await saveTest(d,{loadedFingerprint:first});
 d.m.set(N.candidate,b('PK next source version C'));
 await assert.rejects(saveTest(d,{loadedFingerprint:first}),/STALE_LOADED_SOURCE/);
 const second=await logged(d);const result=await saveTest(d,{loadedFingerprint:second});
 assert.equal(result.before,first.sha256===result.before?'wrong':second.sha256);assert.equal((await inspect(d)).status,'READY');
});
test('RESIDUAL GAP: late source modification at writable-close is overwritten in the mock',async()=>{
 const d=await fresh();const snap=await logged(d);const external=b('PK - competing source just before close');let ran=false;
 d.onClose=(name,dir)=>{if(name===N.src&&!ran){dir.m.set(N.src,external);ran=true}};
 await saveTest(d,{loadedFingerprint:snap});
 assert.equal(ran,true);assert.deepEqual(d.m.get(N.src),candidate);
 // Deliberately proves the race; NOT a safety pass for concurrency.
});
test('RESIDUAL GAP: backup modification after late recheck but before writable-close is overwritten in mock',async()=>{
 const d=await fresh();const snap=await logged(d);await saveTest(d,{loadedFingerprint:snap});
 d.m.set(N.candidate,b('PK - next candidate for backup race'));
 const second=await logged(d);const foreign=b('FOREIGN competing backup');let ran=false;
 d.onClose=(name,dir)=>{if(name===N.backup&&!ran){dir.m.set(N.backup,foreign);ran=true}};
 await saveTest(d,{loadedFingerprint:second});
 assert.equal(ran,true);assert.notDeepEqual(d.m.get(N.backup),foreign);
 // Deliberately proves the race; NOT a safety pass for concurrency.
});
