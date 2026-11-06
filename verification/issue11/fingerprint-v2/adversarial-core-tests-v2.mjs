import {test} from 'node:test';
import assert from 'node:assert/strict';
import {install,saveTest as rawSaveTest,inspect,N,digest,bytes} from './recovery-core-v2.mjs';
const b=(x)=>Uint8Array.from(bytes(x));
class Directory {
  constructor(){this.m=new Map();this.closeHook=null;this.closeCounts=new Map();}
  async getFileHandle(name,{create=false}={}) {
    if (!this.m.has(name)) {
      if(!create)throw Object.assign(new Error('missing'),{name:'NotFoundError'});
      this.m.set(name,new Uint8Array());
    }
    const d=this;
    return {
      async getFile(){const data=d.m.get(name);if(!data)throw Object.assign(new Error('missing'),{name:'NotFoundError'});return {arrayBuffer:async()=>Uint8Array.from(data).buffer};},
      async createWritable(){let data=null;return {
        async write(x){data=b(x)},
        async close(){const count=(d.closeCounts.get(name)||0)+1;d.closeCounts.set(name,count);
          if(d.closeHook){const out=await d.closeHook({name,data,count,directory:d});if(out==='THROW')throw new Error('CLOSE_INJECTED');if(out==='TRUNCATE'){d.m.set(name,data.slice(0,4));return;}}
          d.m.set(name,data);
        }
      }}
    }
  }
  async *entries(){for(const name of this.m.keys())yield [name,{}]}
  async removeEntry(name){if(!this.m.delete(name))throw new Error('missing '+name)}
}
async function saveTest(dir,opts={}){return rawSaveTest(dir,{...opts,loadedFingerprint:{source:N.src,sha256:await digest(dir.m.get(N.src))}})}
const src=b('PK synthetic source candidate A'),cand=b('PK synthetic candidate candidate B');
async function fresh(){const d=new Directory();await install(d,src,cand);return d}
test('second save is allowed with managed predecessor and keeps latest backup',async()=>{
 const d=await fresh();await saveTest(d);const prior=await digest(d.m.get(N.src));d.m.set(N.candidate,b('PK next version C'));await saveTest(d);assert.equal(await digest(d.m.get(N.backup)),prior);assert.equal((await inspect(d)).status,'READY');
});
test('a close exception on stage leaves unknown stage and refuses retries',async()=>{
 const d=await fresh();d.closeHook=({name})=>name===N.stage?'THROW':null;
 await assert.rejects(saveTest(d),/CLOSE_INJECTED/);assert.equal((await inspect(d)).status,'STOP');
});
test('partial stage write is detected and never reaches source',async()=>{
 const d=await fresh();const orig=await digest(d.m.get(N.src));d.closeHook=({name})=>name===N.stage?'TRUNCATE':null;
 await assert.rejects(saveTest(d),/READBACK_MISMATCH/);assert.equal(await digest(d.m.get(N.src)),orig);assert.equal((await inspect(d)).status,'STOP');
});
test('source close exception retains staged predecessor for investigation',async()=>{
 const d=await fresh();const orig=await digest(d.m.get(N.src));d.closeHook=({name})=>name===N.src?'THROW':null;
 await assert.rejects(saveTest(d),/CLOSE_INJECTED/);assert.equal(await digest(d.m.get(N.stage)),orig);assert.equal((await inspect(d)).status,'BEFORE_WRITE');
});
test('partial source write produces STOP and preserved stage',async()=>{
 const d=await fresh();const orig=await digest(d.m.get(N.src));d.closeHook=({name})=>name===N.src?'TRUNCATE':null;
 await assert.rejects(saveTest(d),/READBACK_MISMATCH/);assert.equal(await digest(d.m.get(N.stage)),orig);assert.equal((await inspect(d)).status,'STOP');
});
test('partial backup write produces STOP with staged predecessor',async()=>{
 const d=await fresh();const orig=await digest(d.m.get(N.src));d.closeHook=({name})=>name===N.backup?'TRUNCATE':null;
 await assert.rejects(saveTest(d),/READBACK_MISMATCH/);assert.equal(await digest(d.m.get(N.stage)),orig);assert.equal((await inspect(d)).status,'STOP');
});
test('a backup inserted after source write is never overwritten',async()=>{
 const d=await fresh();const foreign=b('EXTERNAL BACKUP');
 d.closeHook=({name,directory})=>{if(name===N.src){directory.m.set(N.backup,foreign)}return null};
 await assert.rejects(saveTest(d),/FOREIGN_BACKUP_INSERTED/);assert.deepEqual(d.m.get(N.backup),foreign);assert.equal((await inspect(d)).status,'STOP');
});
test('unknown owner metadata with missing backup blocks before staging',async()=>{
 const d=await fresh();d.m.set(N.owner,b('{"protocol":"foreign"}'));
 await assert.rejects(saveTest(d),/ORPHAN_OWNER_METADATA|STOP_EXISTING_STATE/);assert.equal(d.m.has(N.stage),false);
});
test('an unknown existing backup remains unchanged when metadata says managed but hash differs',async()=>{
 const d=await fresh();await saveTest(d);const foreign=b('EXTERNAL MANAGED BACKUP CHANGE');d.m.set(N.backup,foreign);
 await assert.rejects(saveTest(d),/STOP_EXISTING_STATE|BACKUP_HASH_MISMATCH/);assert.deepEqual(d.m.get(N.backup),foreign);
});
