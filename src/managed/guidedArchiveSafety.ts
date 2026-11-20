import JSZip from "jszip";

// Proposed conservative external-import limits; not a general ZIP validator.
export const GUIDED_ARCHIVE_LIMITS = { entries: 256, partBytes: 16 * 1024 * 1024, totalBytes: 64 * 1024 * 1024 };
type Limits = typeof GUIDED_ARCHIVE_LIMITS;
export class GuidedArchiveError extends Error {
  constructor(public readonly code: string) { super(code); }
}
function reject(code = "unsupported-archive"): never { throw new GuidedArchiveError(code); }

/** Reject unsupported ZIP features and ambiguous paths before JSZip's name map
 * can collapse them. Declared sizes are a fast rejection, not a trusted bound. */
function directory(bytes: Uint8Array, limits: Limits) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (p: number) => v.getUint16(p, true);
  const u32 = (p: number) => v.getUint32(p, true);
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (u32(p) === 0x06054b50 && p + 22 + u16(p+20) === bytes.length) { end=p; break; }
  }
  if (end < 0 || u16(end+4) || u16(end+6) || u16(end+8) !== u16(end+10)) reject();
  const count=u16(end+10), start=u32(end+16), size=u32(end+12);
  if (!count || count > limits.entries) reject("archive-entry-limit");
  if (start + size !== end) reject();
  const names=new Map<string,number>(), folded=new Set<string>();
  const spans: [number,number][]=[];
  const decoder=new TextDecoder("utf-8",{fatal:true});
  let at=start, total=0;
  for(let i=0;i<count;i++){
    if(at+46>end || u32(at)!==0x02014b50) reject();
    const flag=u16(at+8), method=u16(at+10), packed=u32(at+20), plain=u32(at+24);
    const n=u16(at+28), x=u16(at+30), c=u16(at+32), local=u32(at+42);
    // No encryption, split disks, ZIP64, or unsupported compression methods.
    if((flag & ~0x080e)!==0 || (method!==0 && method!==8) || u16(at+34)!==0 ||
       packed===0xffffffff || plain===0xffffffff || at+46+n+x+c>end ||
       local+30>start || u32(local)!==0x04034b50) reject();
    if(plain>limits.partBytes || (total+=plain)>limits.totalBytes) reject("archive-expanded-limit");
    const ln=u16(local+26), lx=u16(local+28), data=local+30+ln+lx;
    if(data+packed>start || ln!==n || u16(local+6)!==flag || u16(local+8)!==method ||
       (!(flag&8) && (u32(local+18)!==packed || u32(local+22)!==plain))) reject();
    const raw=bytes.subarray(at+46,at+46+n);
    if(raw.some((b,j)=>b!==bytes[local+30+j])) reject();
    const name=decoder.decode(raw), lower=name.toLowerCase();
    if(!name || name.startsWith("/") || /[\\:\u0000-\u001f]/.test(name) ||
       name.split("/").some((s,j,a)=>s==="."||s===".."||(!s&&j!==a.length-1)) ||
       folded.has(lower)) reject();
    if(name.endsWith("/") && (packed!==0 || plain!==0)) reject();
    names.set(name,plain); folded.add(lower); spans.push([local,data+packed]); at+=46+n+x+c;
  }
  spans.sort((a,b)=>a[0]-b[0]);
  if(at!==end || spans.some((s,i)=>i>0 && s[0]<spans[i-1][1])) reject();
  return names;
}

/** Stream decompression with actual byte accounting. Return a sanitized STORE
 * archive so ExcelJS never receives the original compressed input. No mutation
 * of source bytes. XML/parser complexity needs a separate structural gate. */
export async function prepareBoundedGuidedArchive(bytes:Uint8Array, limits:Limits=GUIDED_ARCHIVE_LIMITS):Promise<Uint8Array>{
  const declared=directory(bytes,limits);
  const zip=await JSZip.loadAsync(bytes);
  const clean=new JSZip();
  let total=0;
  if(Object.keys(zip.files).length!==declared.size) reject();
  for(const [name,expected] of declared){
    const entry=zip.files[name];
    if(!entry) reject();
    if(entry.dir){clean.folder(name);continue;}
    const data=await new Promise<Uint8Array>((resolve,rejectPromise)=>{
      const chunks:Uint8Array[]=[];
      let length=0, stopped=false;
      const stream=entry.internalStream("uint8array");
      stream.on("data",(chunk:Uint8Array)=>{
        if(stopped)return;
        length+=chunk.length; total+=chunk.length;
        if(length>limits.partBytes || total>limits.totalBytes || length>expected){
          stopped=true; stream.pause(); rejectPromise(new GuidedArchiveError("archive-expanded-limit")); return;
        }
        chunks.push(chunk);
      });
      stream.on("error",(error:Error)=>{if(!stopped){stopped=true;rejectPromise(error);}});
      stream.on("end",()=>{
        if(stopped)return;
        if(length!==expected){rejectPromise(new GuidedArchiveError("unsupported-archive"));return;}
        const out=new Uint8Array(length);let offset=0;
        for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}
        resolve(out);
      });
      stream.resume();
    });
    clean.file(name,data,{createFolders:false});
  }
  return clean.generateAsync({type:"uint8array",compression:"STORE"});
}
