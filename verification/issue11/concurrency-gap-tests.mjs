import {test} from 'node:test';
import assert from 'node:assert/strict';
import {install,saveTest,inspect,N,bytes} from './recovery-core.mjs';
const b=x=>Uint8Array.from(bytes(x));
class Dir {
 constructor(){this.m=new Map();this.onWritable=null;this.onClose=null;}
 async getFileHandle(name,{create=false}={}){
  if(!this.m.has(name)){if(!create)throw Object.assign(new Error('missing'),{name:'NotFoundError'});this.m.set(name,new Uint8Array())}
  const d=this;return {async getFile(){return {arrayBuffer:async()=>Uint8Array.from(d.m.get(name)).buffer}},async createWritable(){
   if(d.onWritable)await d.onWritable(name,d);let buf;
   return {async write(v){buf=b(v)},async close(){if(d.onClose)await d.onClose(name,d);d.m.set(name,buf)}};
  }};
 }
 async *entries(){for(const n of this.m.keys())yield[n,{}]}
 async removeEntry(n){this.m.delete(n)}
}
const initial=b('PK synthetic INITIAL content');const candidate=b('PK synthetic CANDIDATE content');
async function fresh(){const dir=new Dir();await install(dir,initial,candidate);return dir}
const equal=(x,y)=>assert.deepEqual(x,y);
test('GAP: prior external source modification is overwritten because no load-time digest exists in harness',async()=>{
 const d=await fresh(),external=b('PK third party edited source before save');d.m.set(N.src,external);
 const r=await saveTest(d);assert.ok(r.before);equal(d.m.get(N.src),candidate);equal(d.m.get(N.backup),external);
 // This is a reproduced gap, NOT a passing safety guarantee.
});
test('GAP: source changes after late digest but before writable close; source overwritten',async()=>{
 const d=await fresh(),external=b('PK third party edited source during write');let mutated=false;
 d.onClose=(name,dir)=>{if(name===N.src&&!mutated){dir.m.set(N.src,external);mutated=true}};
 await saveTest(d);assert.equal(mutated,true);equal(d.m.get(N.src),candidate);equal(d.m.get(N.backup),initial);
});
test('GAP: managed backup changes after backup recheck but before writable close; changed backup overwritten',async()=>{
 const d=await fresh();await saveTest(d);d.m.set(N.candidate,b('PK new desired C'));const external=b('PK another writer modified backup');let mutated=false;
 d.onClose=(name,dir)=>{if(name===N.backup&&!mutated){dir.m.set(N.backup,external);mutated=true}};
 await saveTest(d);assert.equal(mutated,true);equal(d.m.get(N.backup),candidate);
});
test('SAFE: modified backup before the backup recheck fails closed',async()=>{
 const d=await fresh();await saveTest(d);d.m.set(N.candidate,b('PK next candidate'));const external=b('PK external before backup check');
 d.onClose=(name,dir)=>{if(name===N.src){dir.m.set(N.backup,external)}};
 await assert.rejects(saveTest(d),/BACKUP_CHANGED_DURING_SAVE/);equal(d.m.get(N.backup),external);assert.equal((await inspect(d)).status,'STOP');
});
