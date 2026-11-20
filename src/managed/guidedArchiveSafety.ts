import JSZip from "jszip";

// Proposed conservative external-import limits; not a general ZIP validator.
export const GUIDED_ARCHIVE_LIMITS = { entries: 256, partBytes: 16 * 1024 * 1024, totalBytes: 64 * 1024 * 1024 };
type Limits = typeof GUIDED_ARCHIVE_LIMITS;
// JSZip 3.10 exposes internalStream at runtime but omits it from its bundled
// declaration for JSZipObject. Narrow the runtime API rather than using any.
interface ByteStream {
  on(event:"data", handler:(chunk:Uint8Array)=>void):ByteStream;
  on(event:"error", handler:(error:Error)=>void):ByteStream;
  on(event:"end", handler:()=>void):ByteStream;
  pause():ByteStream;
  resume():ByteStream;
}
interface StreamableZipEntry { internalStream(type:"uint8array"):ByteStream; }
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
  const names=new Map<string,{size:number;crc:number}>(), folded=new Set<string>();
  const spans: [number,number][]=[];
  const decoder=new TextDecoder("utf-8",{fatal:true});
  let at=start, total=0;
  for(let i=0;i<count;i++){
    if(at+46>end || u32(at)!==0x02014b50) reject();
    const flag=u16(at+8), method=u16(at+10), crc=u32(at+16), packed=u32(at+20), plain=u32(at+24);
    const n=u16(at+28), x=u16(at+30), c=u16(at+32), local=u32(at+42);
    // No encryption, split disks, ZIP64, or unsupported compression methods.
    if((flag & ~0x080e)!==0 || (method!==0 && method!==8) || u16(at+34)!==0 ||
       packed===0xffffffff || plain===0xffffffff || at+46+n+x+c>end ||
       local+30>start || u32(local)!==0x04034b50) reject();
    if(plain>limits.partBytes || (total+=plain)>limits.totalBytes) reject("archive-expanded-limit");
    const ln=u16(local+26), lx=u16(local+28), data=local+30+ln+lx;
    if(data+packed>start || ln!==n || u16(local+6)!==flag || u16(local+8)!==method ||
       (!(flag&8) && (u32(local+14)!==crc || u32(local+18)!==packed || u32(local+22)!==plain))) reject();
    // Permit ordinary timestamp and platform attributes, not size or path
    // overrides that could make the decompressor disagree with the raw parser.
    function extras(offset:number,length:number){
      const endExtra=offset+length;const seen=new Set<number>();
      while(offset<endExtra){
        if(offset+4>endExtra)reject();
        const kind=u16(offset),len=u16(offset+2);
        if(seen.has(kind)||![0x5455,0x000a,0x7875].includes(kind)||offset+4+len>endExtra)reject();
        seen.add(kind);offset+=4+len;
      }
    }
    extras(at+46+n,x);extras(local+30+ln,lx);
    let spanEnd=data+packed;
    if(flag&8){
      // The descriptor is either signed (16 bytes) or unsigned (12 bytes).
      // Check both interpretations without guessing through CRC ambiguity.
      const valid=(offset:number)=>offset+12<=start&&u32(offset)===crc&&u32(offset+4)===packed&&u32(offset+8)===plain;
      const signed=spanEnd+4<=start&&u32(spanEnd)===0x08074b50&&valid(spanEnd+4);
      const unsigned=valid(spanEnd);
      if(signed===unsigned)reject();
      spanEnd+=signed?16:12;
      if((u32(local+14)!==0&&u32(local+14)!==crc)||(u32(local+18)!==0&&u32(local+18)!==packed)||(u32(local+22)!==0&&u32(local+22)!==plain))reject();
    }
    const raw=bytes.subarray(at+46,at+46+n);
    if(raw.some((b,j)=>b!==bytes[local+30+j])) reject();
    // ZIP without the UTF-8 flag uses a legacy code page. Reject non-ASCII
    // names in that mode rather than letting JSZip and this parser disagree.
    if(!(flag & 0x0800) && raw.some(byte=>byte>=0x80)) reject();
    const name=decoder.decode(raw), lower=name.normalize("NFC").toLowerCase();
    // Reject invisible/bidirectional formatting characters that can disguise paths.
    if(!name || name.startsWith("/") || /[\\:\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/u.test(name) ||
       name.split("/").some((s,j,a)=>s==="."||s===".."||(!s&&j!==a.length-1)) ||
       folded.has(lower)) reject();
    if(name.endsWith("/") && (packed!==0 || plain!==0)) reject();
    names.set(name,{size:plain,crc}); folded.add(lower); spans.push([local,spanEnd]); at+=46+n+x+c;
  }
  // A file cannot simultaneously be a parent directory of another entry.
  // Compare folded paths to avoid case and normalization aliases across entries.
  for (const name of names.keys()) {
    const parts=name.normalize("NFC").toLowerCase().split("/");
    for(let i=1;i<parts.length;i++){
      const parent=parts.slice(0,i).join("/");
      if(folded.has(parent))reject();
    }
  }
  spans.sort((a,b)=>a[0]-b[0]);
  if(at!==end || spans[0]?.[0]!==0 || spans.at(-1)?.[1]!==start || spans.some((s,i)=>i>0 && s[0]!==spans[i-1][1])) reject();
  return names;
}

const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{
  let c=n;for(let i=0;i<8;i++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
function crc32(bytes:Uint8Array,initial:number){
  let crc=initial;for(const value of bytes)crc=CRC_TABLE[(crc^value)&255]^(crc>>>8);return crc>>>0;
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
  for(const [name,metadata] of declared){
    const expected=metadata.size;
    const entry=zip.files[name];
    if(!entry) reject();
    if(entry.dir!==name.endsWith("/"))reject();
    if(entry.dir){if(metadata.crc!==0)reject();clean.file(name,new Uint8Array(0),{dir:true,createFolders:false});continue;}
    const data=await new Promise<Uint8Array>((resolve,rejectPromise)=>{
      const chunks:Uint8Array[]=[];
      let length=0, stopped=false,crc=0xffffffff;
      const streamable=entry as unknown as Partial<StreamableZipEntry>;
      if(typeof streamable.internalStream!=="function"){rejectPromise(new GuidedArchiveError("archive-stream-unavailable"));return;}
      const stream=streamable.internalStream("uint8array");
      stream.on("data",(chunk:Uint8Array)=>{
        if(stopped)return;
        length+=chunk.length; total+=chunk.length;
        if(length>limits.partBytes || total>limits.totalBytes || length>expected){
          stopped=true; stream.pause(); rejectPromise(new GuidedArchiveError("archive-expanded-limit")); return;
        }
        crc=crc32(chunk,crc);
        chunks.push(chunk);
      });
      stream.on("error",(error:Error)=>{if(!stopped){stopped=true;rejectPromise(error);}});
      stream.on("end",()=>{
        if(stopped)return;
        if(length!==expected){rejectPromise(new GuidedArchiveError("unsupported-archive"));return;}
        if(((crc^0xffffffff)>>>0)!==metadata.crc){rejectPromise(new GuidedArchiveError("archive-crc-mismatch"));return;}
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
