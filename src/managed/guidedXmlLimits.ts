import JSZip from "jszip";
import {GuidedArchiveError} from "./guidedArchiveSafety";
export const GUIDED_GRID_LIMITS={rows:20000,columns:128,cells:500000,sheets:64,tags:2000000};
const fail=(code:string):never=>{throw new GuidedArchiveError(code);};
/** Conservative lexical structural gate on already bounded, CRC-checked XML.
 * Reject DTD/entity declarations and unsupported amplification features before
 * ExcelJS creates row/cell objects. This is not a general XML parser. */
export async function verifyGuidedXmlLimits(zip:JSZip){
 const entries=Object.values(zip.files).filter(entry=>!entry.dir);
 let tags=0,sheets=0,cells=0;
 for(const entry of entries){
   if(!/\.(xml|rels)$/i.test(entry.name))continue;
   const xml=await entry.async("string");
   if(/<!DOCTYPE|<!ENTITY/i.test(xml)||/[\u0000]/.test(xml))fail("unsupported-xml");
   // Count start/end-tag delimiters as an upper-bound complexity proxy.
   for(let i=0;i<xml.length;i++)if(xml.charCodeAt(i)===60&&++tags>GUIDED_GRID_LIMITS.tags)fail("xml-complexity-limit");
   // ExcelJS worksheet relationships can target names other than sheetN.xml.
   if(!/<(?:[A-Za-z_][\w.-]*:)?worksheet(?:\s|>)/.test(xml))continue;
   if(++sheets>GUIDED_GRID_LIMITS.sheets)fail("worksheet-count-limit");
   // A small XML merge or column range can allocate an enormous grid.
   if(/<(?:[A-Za-z_][\w.-]*:)?mergeCell(?:\s|\/?>)/.test(xml))fail("merged-source-unsupported");
   let maxRow=0,maxColumn=0;
   for(const m of xml.matchAll(/<(?:[A-Za-z_][\w.-]*:)?(row|c|col)\b([^<>]*)>/g)){
     const [,kind,attrs]=m;
     const attribute=(name:string)=>new RegExp("(?:^|\\s)"+name+"\\s*=\\s*([\"'])([^\"']*)\\1").exec(attrs)?.[2];
     if(kind==="col"){
       const min=attribute("min"),max=attribute("max");
       if(!min||!max||!/^\d+$/.test(min)||!/^\d+$/.test(max)||Number(min)<1||Number(max)<Number(min)||Number(max)>GUIDED_GRID_LIMITS.columns)fail("grid-size-limit");
       continue;
     }
     const coordinate=attribute("r");
     if(!coordinate)return fail("unsupported-grid-coordinate");
     if(kind==="row"){
       if(!/^[1-9]\d{0,4}$/.test(coordinate)||Number(coordinate)>GUIDED_GRID_LIMITS.rows)fail("grid-size-limit");
       maxRow=Math.max(maxRow,Number(coordinate));continue;
     }
     const address=/^([A-Z]{1,3})([1-9]\d{0,4})$/.exec(coordinate);
     if(!address)return fail("unsupported-grid-coordinate");
     let col=0;for(const letter of address[1])col=col*26+letter.charCodeAt(0)-64;
     maxColumn=Math.max(maxColumn,col);maxRow=Math.max(maxRow,Number(address[2]));
     if(++cells>GUIDED_GRID_LIMITS.cells||maxColumn>GUIDED_GRID_LIMITS.columns||maxRow>GUIDED_GRID_LIMITS.rows||maxColumn*maxRow>GUIDED_GRID_LIMITS.cells)fail("grid-size-limit");
   }
 }
}
