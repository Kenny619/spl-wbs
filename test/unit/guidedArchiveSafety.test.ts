import JSZip from "jszip";
import {describe,it,expect} from "vitest";
import {GUIDED_ARCHIVE_LIMITS,prepareBoundedGuidedArchive} from "../../src/managed/guidedArchiveSafety";
const limits={entries:8,partBytes:1024,totalBytes:1536};
async function archive(entries:Record<string,string>){
 const z=new JSZip();for(const [name,value] of Object.entries(entries))z.file(name,value,{createFolders:false});
 return z.generateAsync({type:"uint8array",compression:"DEFLATE"});
}
describe("guided archive bounded preparation",()=>{
 it("preserves bytes and contents while rebuilding an ordinary compressed package",async()=>{
  const source=await archive({"xl/workbook.xml":"abc","xl/worksheets/sheet1.xml":"def"});
  const original=source.slice(), rebuilt=await prepareBoundedGuidedArchive(source,limits);
  expect(source).toEqual(original);
  expect(await (await JSZip.loadAsync(rebuilt)).file("xl/workbook.xml")!.async("string")).toBe("abc");
 });
 it("normalizes JSZip parser failures after central-directory preflight",async()=>{
  // A valid ZIP structure with an invalid compression stream must not leak
  // JSZip-specific errors into the guided-import review flow.
  const source=await archive({"part":"a".repeat(120)});
  const view=new DataView(source.buffer,source.byteOffset,source.byteLength);
  const central=view.getUint32(source.length-22+16,true);
  const packed=view.getUint32(central+20,true);
  expect(packed).toBeGreaterThan(0);
  const corrupted=source.slice();
  corrupted[30+"part".length]=0xff; // first DEFLATE byte
  const before=corrupted.slice();
  await expect(prepareBoundedGuidedArchive(corrupted,limits)).rejects.toMatchObject({code:"unsupported-archive"});
  expect(corrupted).toEqual(before); // failure must never mutate the supplied workbook bytes
 });
 it("rejects unsafe resource-limit overrides before reading archive bytes",async()=>{
  const source=await archive({"part":"ok"});
  const before=source.slice();
  for(const invalid of [
    {...limits,entries:0},
    {...limits,entries:Infinity},
    {...limits,partBytes:NaN},
    {...limits,totalBytes:-1},
    {...limits,totalBytes:1.5},
    {...limits,totalBytes:Number.MAX_SAFE_INTEGER+1},
    {...limits,entries:GUIDED_ARCHIVE_LIMITS.entries+1},
    {...limits,partBytes:GUIDED_ARCHIVE_LIMITS.partBytes+1},
    {...limits,totalBytes:GUIDED_ARCHIVE_LIMITS.totalBytes+1},
  ]){
    await expect(prepareBoundedGuidedArchive(source,invalid)).rejects.toMatchObject({code:"archive-invalid-limits"});
  }
  expect(source).toEqual(before);
 });
 it("rejects oversized ZIP container metadata before parsing",async()=>{
  const z=new JSZip();z.file("part","ok",{createFolders:false});
  const oversized=await z.generateAsync({type:"uint8array",compression:"DEFLATE",comment:"x".repeat(10000)});
  await expect(prepareBoundedGuidedArchive(oversized,limits)).rejects.toMatchObject({code:"archive-input-limit"});
  const ordinary=await z.generateAsync({type:"uint8array",compression:"DEFLATE"});
  expect(await (await JSZip.loadAsync(await prepareBoundedGuidedArchive(ordinary,limits))).file("part")!.async("string")).toBe("ok");
 });
 it("rejects declared individual and aggregate expansion beyond limits",async()=>{
  await expect(prepareBoundedGuidedArchive(await archive({"big":"x".repeat(1025)}),limits)).rejects.toMatchObject({code:"archive-expanded-limit"});
  await expect(prepareBoundedGuidedArchive(await archive({"one":"x".repeat(800),"two":"y".repeat(800)}),limits)).rejects.toMatchObject({code:"archive-expanded-limit"});
 });
 it("rejects ambiguous paths before JSZip normalizes them",async()=>{
  await expect(prepareBoundedGuidedArchive(await archive({"xl/../workbook.xml":"x"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
  await expect(prepareBoundedGuidedArchive(await archive({"one":"a","ONE":"b"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
 });
 it("rejects non-UTF8-flagged high-bit names and Unicode-normalization collisions",async()=>{
  const legacy=await archive({"a":"x"});
  const v=new DataView(legacy.buffer,legacy.byteOffset,legacy.byteLength);
  const central=v.getUint32(legacy.length-22+16,true);
  legacy[30]=0xe9;legacy[central+46]=0xe9;
  await expect(prepareBoundedGuidedArchive(legacy,limits)).rejects.toMatchObject({code:"unsupported-archive"});
  const normalized=await archive({"é":"x","é":"y"});
  await expect(prepareBoundedGuidedArchive(normalized,limits)).rejects.toMatchObject({code:"unsupported-archive"});
 });
 it("accepts matching Unicode Path extras and rejects a forged alias",async()=>{
  const original=await archive({"xl/caf\u00e9.xml":"ok"});
  const good=await prepareBoundedGuidedArchive(original,limits);
  expect(await (await JSZip.loadAsync(good)).file("xl/caf\u00e9.xml")!.async("string")).toBe("ok");
  const forged=original.slice(), view=new DataView(forged.buffer,forged.byteOffset,forged.byteLength);
  const central=view.getUint32(forged.length-22+16,true);
  const nameLength=view.getUint16(central+28,true);
  const extra=central+46+nameLength;
  // JSZip emits a 0x7075 Unicode Path extra with a CRC and UTF-8 alias.
  expect(view.getUint16(extra,true)).toBe(0x7075);
  forged[extra+9]^=1;
  await expect(prepareBoundedGuidedArchive(forged,limits)).rejects.toMatchObject({code:"unsupported-archive"});
 });
 it("rejects a single non-NFC path while preserving composed Unicode",async()=>{
  await expect(prepareBoundedGuidedArchive(await archive({"xl/cafe\u0301.xml":"x"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
  const good=await prepareBoundedGuidedArchive(await archive({"xl/caf\u00e9.xml":"x"}),limits);
  expect(await (await JSZip.loadAsync(good)).file("xl/caf\u00e9.xml")!.async("string")).toBe("x");
 });
 it("rejects malformed UTF-8 filenames with a controlled archive error",async()=>{
  for(const malformed of [0xc0,0xff,0x80]){
   const bytes=await archive({"a":"ok"});
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   const central=view.getUint32(bytes.length-22+16,true);
   view.setUint16(6,view.getUint16(6,true)|0x0800,true);
   view.setUint16(central+8,view.getUint16(central+8,true)|0x0800,true);
   bytes[30]=malformed;bytes[central+46]=malformed;
   await expect(prepareBoundedGuidedArchive(bytes,limits)).rejects.toMatchObject({code:"unsupported-archive"});
  }
 });
 it("rejects invisible and bidirectional Unicode path controls",async()=>{
  for(const name of ["xl/\u202eworkbook.xml","xl/\u200bworkbook.xml","xl/\u2066workbook.xml","xl/\u00adworkbook.xml","xl/\u061cworkbook.xml","xl/\u2063workbook.xml","xl/\u034fworkbook.xml","xl/\ufe0fworkbook.xml"]){
   await expect(prepareBoundedGuidedArchive(await archive({[name]:"xml"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
  }
 });
 it("rejects file/directory ancestor conflicts before rebuilding",async()=>{
  await expect(prepareBoundedGuidedArchive(await archive({"xl":"file","xl/workbook.xml":"xml"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
  await expect(prepareBoundedGuidedArchive(await archive({"XL":"file","xl/workbook.xml":"xml"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
 });
 it("rejects directory/file aliases with identical normalized paths",async()=>{
  for(const entries of [
   {"xl":"file","xl/":""},
   {"XL":"file","xl/":""},
   {"xl":"file","XL/":""},
  ]){
   await expect(prepareBoundedGuidedArchive(await archive(entries),limits)).rejects.toMatchObject({code:"unsupported-archive"});
  }
  const valid=await prepareBoundedGuidedArchive(await archive({"xl/":"","xl/workbook.xml":"ok"}),limits);
  expect(await (await JSZip.loadAsync(valid)).file("xl/workbook.xml")!.async("string")).toBe("ok");
 });
 it("rejects Windows path aliases but preserves ordinary workbook parts",async()=>{
  for(const name of ["xl/sheet.xml ","xl/sheet.xml.","xl/CON.xml","xl/lpt1.txt","AUX/data.xml","xl/PRN.txt","xl/NUL","xl/com9.bin","xl/LPT2.csv","xl/COM¹.txt","xl/LPT³.xml","xl/a?b.xml","xl/a*b.xml","xl/a|b.xml","xl/a<b.xml","xl/a>b.xml","xl/a\"b.xml"]){
   await expect(prepareBoundedGuidedArchive(await archive({[name]:"x"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
  }
  for(const name of ["xl/console.xml","xl/com10.xml","xl/auxiliary.xml"]){
   const accepted=await prepareBoundedGuidedArchive(await archive({[name]:"ok"}),limits);
   expect(await (await JSZip.loadAsync(accepted)).file(name)!.async("string")).toBe("ok");
  }
  const safe=await prepareBoundedGuidedArchive(await archive({"xl/worksheets/sheet1.xml":"ok"}),limits);
  expect(await (await JSZip.loadAsync(safe)).file("xl/worksheets/sheet1.xml")!.async("string")).toBe("ok");
 });
 it("rejects Unix symlink and special-file archive entries before decompression",async()=>{
  const ordinary=await archive({"xl/workbook.xml":"ok"});
  const central=new DataView(ordinary.buffer,ordinary.byteOffset,ordinary.byteLength).getUint32(ordinary.length-22+16,true);
  for(const mode of [0xa000,0x2000,0x6000]){
   const forged=ordinary.slice(),view=new DataView(forged.buffer,forged.byteOffset,forged.byteLength);
   forged[central+5]=3; // Unix creator platform
   view.setUint16(central+40,mode,true); // high half of external attributes
   await expect(prepareBoundedGuidedArchive(forged,limits)).rejects.toMatchObject({code:"unsupported-archive"});
  }
  // A forged Unix directory mode on a file path must not be interpreted
  // as an ordinary file, nor may a regular-file mode label a directory path.
  const mismatched=ordinary.slice(), mismatchView=new DataView(mismatched.buffer,mismatched.byteOffset,mismatched.byteLength);
  mismatched[central+5]=3;
  mismatchView.setUint16(central+40,0x4000,true);
  await expect(prepareBoundedGuidedArchive(mismatched,limits)).rejects.toMatchObject({code:"unsupported-archive"});
  const directoryArchive=await archive({"xl/":""});
  const directoryView=new DataView(directoryArchive.buffer,directoryArchive.byteOffset,directoryArchive.byteLength);
  const directoryCentral=directoryView.getUint32(directoryArchive.length-22+16,true);
  directoryArchive[directoryCentral+5]=3;
  directoryView.setUint16(directoryCentral+40,0x8000,true);
  await expect(prepareBoundedGuidedArchive(directoryArchive,limits)).rejects.toMatchObject({code:"unsupported-archive"});
  const regular=ordinary.slice(),view=new DataView(regular.buffer,regular.byteOffset,regular.byteLength);
  regular[central+5]=3;
  view.setUint16(central+40,0x8000,true);
  expect(await (await JSZip.loadAsync(await prepareBoundedGuidedArchive(regular,limits))).file("xl/workbook.xml")!.async("string")).toBe("ok");
 });
 it("rejects a forged smaller declared size rather than trusting metadata",async()=>{
  const source=await archive({"big":"x".repeat(2000)});
  const view=new DataView(source.buffer,source.byteOffset,source.byteLength);
  const central=view.getUint32(source.length-22+16,true);
  view.setUint32(22,100,true);view.setUint32(central+24,100,true);
  await expect(prepareBoundedGuidedArchive(source,limits)).rejects.toBeDefined();
 });
 it("rejects mismatched CRC even if both declared CRC fields agree",async()=>{
  const source=await archive({"part":"abc"});
  const view=new DataView(source.buffer,source.byteOffset,source.byteLength);
  const central=view.getUint32(source.length-22+16,true);
  view.setUint32(14,0,true);view.setUint32(central+16,0,true);
  await expect(prepareBoundedGuidedArchive(source,limits)).rejects.toMatchObject({code:"archive-crc-mismatch"});
 });
 it("accepts a normal signed streaming data descriptor and refuses a modified descriptor",async()=>{
  const z=new JSZip();z.file("part","abc",{createFolders:false});
  const source=await z.generateAsync({type:"uint8array",compression:"DEFLATE",streamFiles:true});
  expect(await (await JSZip.loadAsync(await prepareBoundedGuidedArchive(source,limits))).file("part")!.async("string")).toBe("abc");
  const view=new DataView(source.buffer,source.byteOffset,source.byteLength);
  const central=view.getUint32(source.length-22+16,true);
  view.setUint32(central-4,123,true);
  await expect(prepareBoundedGuidedArchive(source,limits)).rejects.toMatchObject({code:"unsupported-archive"});
 });
});
