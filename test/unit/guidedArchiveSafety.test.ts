import JSZip from "jszip";
import {describe,it,expect} from "vitest";
import {prepareBoundedGuidedArchive} from "../../src/managed/guidedArchiveSafety";
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
 it("rejects oversized ZIP container metadata before parsing",async()=>{\n  const z=new JSZip();z.file("part","ok",{createFolders:false});\n  const oversized=await z.generateAsync({type:"uint8array",compression:"DEFLATE",comment:"x".repeat(10000)});\n  await expect(prepareBoundedGuidedArchive(oversized,limits)).rejects.toMatchObject({code:"archive-input-limit"});\n  const ordinary=await z.generateAsync({type:"uint8array",compression:"DEFLATE"});\n  expect(await (await JSZip.loadAsync(await prepareBoundedGuidedArchive(ordinary,limits))).file("part")!.async("string")).toBe("ok");\n });\n it("rejects declared individual and aggregate expansion beyond limits",async()=>{
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
 it("rejects invisible and bidirectional Unicode path controls",async()=>{
  for(const name of ["xl/\u202eworkbook.xml","xl/\u200bworkbook.xml","xl/\u2066workbook.xml"]){
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
  for(const name of ["xl/sheet.xml ","xl/sheet.xml.","xl/CON.xml","xl/lpt1.txt","AUX/data.xml","xl/PRN.txt","xl/NUL","xl/com9.bin","xl/LPT2.csv"]){
   await expect(prepareBoundedGuidedArchive(await archive({[name]:"x"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
  }
  for(const name of ["xl/console.xml","xl/com10.xml","xl/auxiliary.xml"]){
   const accepted=await prepareBoundedGuidedArchive(await archive({[name]:"ok"}),limits);
   expect(await (await JSZip.loadAsync(accepted)).file(name)!.async("string")).toBe("ok");
  }
  const safe=await prepareBoundedGuidedArchive(await archive({"xl/worksheets/sheet1.xml":"ok"}),limits);
  expect(await (await JSZip.loadAsync(safe)).file("xl/worksheets/sheet1.xml")!.async("string")).toBe("ok");
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
