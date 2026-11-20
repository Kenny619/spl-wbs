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
 it("rejects declared individual and aggregate expansion beyond limits",async()=>{
  await expect(prepareBoundedGuidedArchive(await archive({"big":"x".repeat(1025)}),limits)).rejects.toMatchObject({code:"archive-expanded-limit"});
  await expect(prepareBoundedGuidedArchive(await archive({"one":"x".repeat(800),"two":"y".repeat(800)}),limits)).rejects.toMatchObject({code:"archive-expanded-limit"});
 });
 it("rejects ambiguous paths before JSZip normalizes them",async()=>{
  await expect(prepareBoundedGuidedArchive(await archive({"xl/../workbook.xml":"x"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
  await expect(prepareBoundedGuidedArchive(await archive({"one":"a","ONE":"b"}),limits)).rejects.toMatchObject({code:"unsupported-archive"});
 });
 it("rejects a forged smaller declared size rather than trusting metadata",async()=>{
  const source=await archive({"big":"x".repeat(2000)});
  const view=new DataView(source.buffer,source.byteOffset,source.byteLength);
  const central=view.getUint32(source.length-22+16,true);
  view.setUint32(22,100,true);view.setUint32(central+24,100,true);
  await expect(prepareBoundedGuidedArchive(source,limits)).rejects.toBeDefined();
 });
});
