import ExcelJS from "exceljs";
import JSZip from "jszip";
import { interpretExcelDate, interpretExcelTimestamp } from "../calendar/dateOnly";
import { previewMappedRows, type HeaderOverride, type SourceRecord } from "./guidedImportMapping";
import { normalizeGuidedRows } from "./guidedImportNormalize";

type ReadIssue = {code: string; row?: number; column?: number};
type Grid = {kind:"grid"; sheetName:string; date1904:boolean; headers:string[]; records:SourceRecord[]; issues:ReadIssue[]};
type ReadResult = Grid | {kind:"choose-sheet"; names:string[]} | {kind:"native-workbook"} | {kind:"rejected"; issues:ReadIssue[]};
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_ROWS = 20000;
const MAX_COLUMNS = 128;
const MAX_CELLS = 500000;
const managedSheets = new Set(["projectmeta","projectcalendar","watchreasons","projectcommitments","projectaudit","updatehistory"]);
type Opaque = {kind:"unsupported"; reason:string};
const unsupported = (reason:string):Opaque => ({kind:"unsupported",reason});
function adapt(value:ExcelJS.CellValue, format:string|null, date1904:boolean):unknown {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return {kind:"number",value,format};
  if (value instanceof Date) {
    const iso = interpretExcelDate(value,date1904), timestamp = interpretExcelTimestamp(value,date1904);
    return iso && timestamp ? (timestamp.endsWith("T00:00:00.000Z")?{kind:"date",iso}:{kind:"timestamp",iso:timestamp}) : unsupported("invalid-date");
  }
  if (typeof value !== "object") return unsupported("unsupported-scalar");
  if ("formula" in value || "sharedFormula" in value) {
    // Cached results are not executed or implicitly trusted. Missing caches
    // must never make a populated source row disappear.
    return unsupported("formula-review-required");
  }
  if ("richText" in value && Array.isArray(value.richText)) return value.richText.map(part=>part.text ?? "").join("");
  if ("hyperlink" in value) return unsupported("hyperlink-review-required");
  return unsupported("unsupported-cell");
}
/** Read only. Existing managed/legacy-extension books must not be
 * accidentally converted and lose history. Limits bound post-load traversal,
 * not XLSX decompression; untrusted-file resource hardening remains separate. */
export async function readGuidedSource(bytes:Uint8Array, selected?:string):Promise<ReadResult> {
  if (!bytes.length || bytes.length > MAX_BYTES) return {kind:"rejected",issues:[{code:"file-size-limit"}]};
  try {
    const zip = await JSZip.loadAsync(bytes);
    if (Object.keys(zip.files).some(name=>/vbaProject\.bin$/i.test(name))) return {kind:"rejected",issues:[{code:"macro-workbook"}]};
    const entry = zip.file("xl/workbook.xml");
    if (!entry) return {kind:"rejected",issues:[{code:"invalid-xlsx"}]};
    const xml = await entry.async("string");
    let prepared = bytes;
    if (/date1904\s*=\s*["']true["']/i.test(xml)) {
      zip.file("xl/workbook.xml",xml.replace(/date1904\s*=\s*["']true["']/gi,'date1904="1"'));
      prepared=await zip.generateAsync({type:"uint8array"});
    }
    const book=new ExcelJS.Workbook();
    await book.xlsx.load(prepared as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    if (book.worksheets.some(s=>managedSheets.has(s.name.trim().toLowerCase()))) return {kind:"native-workbook"};
    const names=book.worksheets.map(s=>s.name);
    const sheet=selected===undefined?(names.length===1?book.worksheets[0]:undefined):book.worksheets.find(s=>s.name===selected);
    if (!sheet) return selected===undefined?{kind:"choose-sheet",names}:{kind:"rejected",issues:[{code:"unknown-sheet"}]};
    if (sheet.rowCount>MAX_ROWS || sheet.columnCount>MAX_COLUMNS || sheet.rowCount*sheet.columnCount>MAX_CELLS) return {kind:"rejected",issues:[{code:"grid-size-limit"}]};
    const date1904=Boolean(book.properties.date1904);
    const issues:ReadIssue[]=[];
    // Count columns across the whole sheet, not merely header width.
    const width=sheet.columnCount;
    const headers:string[]=[];
    for(let n=1;n<=width;n++){
      const cell=sheet.getRow(1).getCell(n);
      const v=cell.isMerged?unsupported("merged"):adapt(cell.value,cell.numFmt??null,date1904);
      if(v!==null && typeof v!=="string") issues.push({code:"invalid-header",row:1,column:n});
      headers.push(typeof v==="string"?v:"");
    }
    const records:SourceRecord[]=[];
    for(let row=2;row<=sheet.rowCount;row++){
      const cells:unknown[]=[];
      for(let n=1;n<=width;n++){
        const cell=sheet.getRow(row).getCell(n);
        const v=cell.isMerged?unsupported("merged-cell"):adapt(cell.value,cell.numFmt??null,date1904);
        if(v && typeof v==="object" && (v as {kind?:string}).kind==="unsupported") issues.push({code:(v as Opaque).reason,row,column:n});
        cells.push(v);
      }
      records.push({excelRow:row,cells});
    }
    return {kind:"grid",sheetName:sheet.name,date1904,headers,records,issues};
  } catch {return {kind:"rejected",issues:[{code:"unreadable-xlsx"}]};}
}
export function prepareGuidedPreview(grid:Grid, generatedIds:Readonly<Record<number,string>>,
  overrides:readonly HeaderOverride[]=[], progressScale?:"percent-points"|"fraction"){
  const mapping=previewMappedRows(grid.headers,grid.records,overrides);
  const normalized=normalizeGuidedRows(mapping.rows,{date1904:grid.date1904,generatedIds,progressScale});
  return {mapping,normalized,readerIssues:grid.issues,sourceItemCount:mapping.rows.length,
    corePreviewValid:grid.issues.length===0 && mapping.mappingReady && normalized.coreValid,
    // Explicitly not permission to create a workbook.
    persistenceReady:false as const};
}
