/**
 * Stage A: best-effort browser-local recent workbook handles.
 * Never persist workbook bytes, task rows, credentials or absolute paths.
 */
export type RecentProjectEntry = {
  directory: FileSystemDirectoryHandle;
  fileName: string;
  displayName: string;
  lastAccess: string; // local access instant, not an audited workbook timestamp
};
export type RecentSnapshot = { entries: RecentProjectEntry[]; persistent: boolean };
const DB_NAME = "spt-wbs-recent-projects-v1";
const STORE = "recent";
const KEY = "five";
const MAX = 5;

function isEligibleFile(name:string):boolean {
  return /\.xlsx$/i.test(name)&&!name.startsWith("~$")&&
    !/\.(?:backup|stage)\.xlsx$/i.test(name);
}
function validEntry(entry:unknown):entry is RecentProjectEntry {
  if(!entry||typeof entry!=="object")return false;
  const e=entry as Partial<RecentProjectEntry>;
  return e.directory?.kind==="directory"&&
    typeof e.directory.name==="string"&&
    typeof e.fileName==="string"&&isEligibleFile(e.fileName)&&
    typeof e.displayName==="string"&&e.displayName.length<=300&&
    typeof e.lastAccess==="string"&&!Number.isNaN(Date.parse(e.lastAccess));
}
async function sameIdentity(a:RecentProjectEntry,b:RecentProjectEntry):Promise<boolean> {
  if(a.fileName!==b.fileName)return false;
  if(a.directory===b.directory)return true;
  try {return await a.directory.isSameEntry(b.directory);}
  catch {return false;}
}
/** Ordered newest first; same-named XLSX in different folders is distinct. */
export async function rankRecentProjects(
  entries:readonly RecentProjectEntry[],next?:RecentProjectEntry,
):Promise<RecentProjectEntry[]>{
  const result:RecentProjectEntry[]=[];
  for(const entry of [...(next?[next]:[]),...entries]){
    if(!validEntry(entry))continue;
    let duplicate=false;
    for(const prior of result)if(await sameIdentity(prior,entry)){duplicate=true;break;}
    if(!duplicate)result.push(entry);
    if(result.length===MAX)break;
  }
  return result;
}
function openDB(factory:IDBFactory):Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const req=factory.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error??new Error("Recent project storage unavailable."));
    req.onblocked=()=>reject(new Error("Recent project storage in use."));
  });
}
async function readDB(factory:IDBFactory):Promise<unknown>{
  const db=await openDB(factory);
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly");
      const req=tx.objectStore(STORE).get(KEY);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error??new Error("Recent project read failed."));
      tx.onabort=()=>reject(tx.error??new Error("Recent project read aborted."));
    });
  }finally{db.close();}
}
async function writeDB(factory:IDBFactory,entries:RecentProjectEntry[]):Promise<void>{
  const db=await openDB(factory);
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put(entries,KEY);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error??new Error("Recent project write failed."));
      tx.onabort=()=>reject(tx.error??new Error("Recent project write aborted."));
    });
  }finally{db.close();}
}
export class RecentProjectStore{
  private current:RecentProjectEntry[]=[];
  private persistent=false;
  constructor(private readonly factory:IDBFactory|null=
    typeof indexedDB==="undefined"?null:indexedDB){}
  async load():Promise<RecentSnapshot>{
    if(!this.factory)return {entries:[...this.current],persistent:false};
    try {
      const raw=await readDB(this.factory);
      this.current=await rankRecentProjects(Array.isArray(raw)?raw:[]);
      this.persistent=true;
    }catch{this.persistent=false;}
    return {entries:[...this.current],persistent:this.persistent};
  }
  async remember(next:RecentProjectEntry):Promise<RecentSnapshot>{
    if(!validEntry(next))return {entries:[...this.current],persistent:this.persistent};
    this.current=await rankRecentProjects(this.current,next);
    if(this.factory){
      try{await writeDB(this.factory,this.current);this.persistent=true;}
      catch{this.persistent=false;}
    }else this.persistent=false;
    return {entries:[...this.current],persistent:this.persistent};
  }
}
