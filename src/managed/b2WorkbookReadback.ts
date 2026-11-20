import ExcelJS from "exceljs";
import { B2_CREATE_FIELDS, type B2CreateField, type B2SnapshotValue } from "./b2CreateAuditPlan";
import { MANIFEST_FIELD, parseCreateManifest } from "./b2ContinuityProof";
import { validateTypedB2Groups, verifyPhysicalPrefix } from "./b2TypedProof";
import { HISTORY_COLUMNS, EDITABLE_FIELDS } from "./workbookCandidate";
import { PREDECESSOR_SEPARATOR } from "../config/decisions";

const AUDIT_COLUMNS=["EventID","ChangeSetID","TimestampUTC","EntityType","EntityID","TaskID","Action","Field","OldValue","NewValue","ActorLabel","ActorProvenance","Source","AppVersion"] as const;
type Group=Parameters<typeof validateTypedB2Groups>[0][number];
type Edit=Parameters<typeof validateTypedB2Groups>[1][number];
type Snapshot=Partial<Record<B2CreateField,B2SnapshotValue>>;
const required=["ID","Title","WBSCode","TaskType"];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(message:string):never=>{throw new Error(message);};
function rows(sheet:ExcelJS.Worksheet|undefined):ExcelJS.Row[]{
  if(!sheet)return [];
  const result:ExcelJS.Row[]=[];
  sheet.eachRow({includeEmpty:false},(row,index)=>{if(index>1)result.push(row);});
  return result;
}
function sheet(book:ExcelJS.Workbook,name:string):ExcelJS.Worksheet|undefined{
  const matches=book.worksheets.filter(s=>s.name.toLowerCase()===name.toLowerCase());
  if(matches.length>1)fail("duplicate-sheet:"+name);
  return matches[0];
}
function columns(s:ExcelJS.Worksheet,recognized:readonly string[],mandatory:readonly string[]){
  const result=new Map<string,number>();
  s.getRow(1).eachCell({includeEmpty:false},(cell,index)=>{
    if(typeof cell.value!=="string"||cell.isMerged)fail("invalid-header:"+s.name);
    const name=recognized.find(f=>f.toLowerCase()===String(cell.value).trim().toLowerCase());
    if(!name)return fail("unsupported-header:"+s.name);
    if(result.has(name))fail("duplicate-header:"+name);
    result.set(name,index);
  });
  for(const name of mandatory)if(!result.has(name))fail("missing-header:"+name);
  // Every populated physical cell must belong to a recognized column.
  const used=new Set(result.values());
  for(const row of rows(s))row.eachCell({includeEmpty:false},(cell,index)=>{
    if(!used.has(index)||cell.isMerged)fail("unsupported-cell:"+s.name);
  });
  return result;
}
function value(row:ExcelJS.Row,col:Map<string,number>,name:string):ExcelJS.CellValue{
  const index=col.get(name);
  if(index===undefined)return fail("missing-field:"+name);
  return row.getCell(index).value;
}
function text(v:ExcelJS.CellValue,blank=false):string{
  if(v===null&&blank)return "";
  if(typeof v!=="string"||(!blank&&!v.trim()))return fail("invalid-audit-text");
  return v;
}
function identity(v:ExcelJS.CellValue):string{
  // Legacy numeric identities are retained and never rewritten.
  if(typeof v==="number"&&Number.isSafeInteger(v))return String(v);
  return text(v);
}
const idKey=(id:string)=>uuid.test(id)?id.toLowerCase():id;
function physical(s:ExcelJS.Worksheet|undefined){
  if(!s)return [];
  return [s.getRow(1),...rows(s)].map(row=>{
    const cells:unknown[]=[];
    for(let i=1;i<=s.columnCount;i++)cells.push(row.getCell(i).value);
    return cells;
  });
}
function snapshotValue(cell:ExcelJS.Cell,field:B2CreateField):B2SnapshotValue{
  const v=cell.value;
  if(v===null)return null;
  if(field==="Progress"||field==="SortOrder"){
    if(typeof v!=="number"||!Number.isFinite(v))return fail("invalid-number:"+field);
    const percent=(cell.numFmt??"").replace(/"[^"]*"/g,"").replace(/\\./g,"").includes("%");
    return field==="Progress"&&percent?v*100:v;
  }
  if(field==="PredecessorIDs"){
    if(typeof v!=="string")return fail("invalid-predecessors");
    return v.split(PREDECESSOR_SEPARATOR).filter(Boolean);
  }
  if(field==="PlannedStart"||field==="PlannedEnd"){
    if(v instanceof Date&&Number.isFinite(v.getTime()))return v.toISOString().slice(0,10);
  }
  if(field==="Modified"&&v instanceof Date&&Number.isFinite(v.getTime()))return v.toISOString();
  if(typeof v!=="string")return fail("unsupported-wbs-value:"+field);
  return v;
}

/** Experimental readback proof, not the versioned managed inspector.
 * Exact canonical headers only; unsupported legacy aliases fail closed here.
 * Does not write, authorize or upgrade any workbook. */
export function verifyB2WorkbookReadback(original:ExcelJS.Workbook,candidate:ExcelJS.Workbook){
  try{
    const audit=sheet(candidate,"ProjectAudit"),history=sheet(candidate,"UpdateHistory"),wbs=sheet(candidate,"ProjectWBS");
    if(!audit||!wbs)return fail("missing-b2-sheet");
    for(const name of ["ProjectAudit","UpdateHistory"]){
      const before=sheet(original,name),after=sheet(candidate,name);
      if(before&&(!after||!verifyPhysicalPrefix(physical(before),physical(after))))return fail("prefix-changed:"+name);
    }
    const aCols=columns(audit,AUDIT_COLUMNS,AUDIT_COLUMNS);
    const wCols=columns(wbs,B2_CREATE_FIELDS,required);
    const hCols=history?columns(history,HISTORY_COLUMNS,HISTORY_COLUMNS):new Map<string,number>();
    const allGroups=new Map<string,Group[number][]>();
    const priorEventIds:string[]=[];
    const priorTaskIds=new Set<string>();
    const originalIds=new Set<string>();
    const originalWbs=sheet(original,"ProjectWBS");
    if(originalWbs){
      const originalColumns=columns(originalWbs,B2_CREATE_FIELDS,required);
      for(const row of rows(originalWbs)){
        const key=idKey(identity(value(row,originalColumns,"ID")));
        if(originalIds.has(key))return fail("duplicate-original-wbs-id");
        originalIds.add(key);priorTaskIds.add(key);
      }
    }
    const originalAudit=sheet(original,"ProjectAudit");
    const prefixCount=rows(originalAudit).length;
    const historyBefore=sheet(original,"UpdateHistory");
    const historyBoundary=rows(historyBefore).length;
    const newTasks=new Set<string>();
    const auditRows=rows(audit);
    for(let index=0;index<auditRows.length;index++){
      const row=auditRows[index],get=(f:string)=>value(row,aCols,f);
      if(get("EntityType")!=="Task"||get("Action")!=="Create"){
        priorEventIds.push(text(get("EventID")));
        const task=get("TaskID"); if(task!==null&&task!=="")priorTaskIds.add(idKey(identity(task)));
        if(get("Field")===MANIFEST_FIELD)return fail("manifest-outside-create");
        continue;
      }
      const raw=Object.fromEntries(AUDIT_COLUMNS.map(f=>[f,text(get(f),f==="OldValue"||f==="NewValue")])) as Group[number];
      const key=idKey(raw.TaskID);
      if(index>=prefixCount)newTasks.add(key);
      const group=allGroups.get(key)??[];
      group.push(raw);allGroups.set(key,group);
    }
    const edits:Edit[]=rows(history).map(row=>{
      const get=(f:string)=>value(row,hCols,f);
      const field=text(get("Field")) as B2CreateField;
      if(!EDITABLE_FIELDS.some(f=>f===field))return fail("unsupported-history-field");
      return {TaskID:identity(get("TaskID")),ChangeSetID:text(get("ChangeSetID")),TimestampUTC:text(get("TimestampUTC")),Field:field,OldValue:get("OldValue"),NewValue:get("NewValue")};
    });
    for(const e of edits.slice(0,historyBoundary))priorTaskIds.add(idKey(e.TaskID));
    const current=new Map<string,Snapshot>(),seen=new Set<string>();
    for(const row of rows(wbs)){
      const id=identity(value(row,wCols,"ID")),key=idKey(id);
      if(seen.has(key))return fail("duplicate-wbs-id");
      seen.add(key);
      const group=allGroups.get(key);
      if(!originalIds.has(key)&&!newTasks.has(key))return fail("untracked-new-task");
      if(!group)continue;
      const manifestRow=group.find(r=>r.Field===MANIFEST_FIELD);
      const manifest=manifestRow&&parseCreateManifest(manifestRow.NewValue);
      if(!manifest)return fail("invalid-manifest");
      if(newTasks.has(key)){
        if(priorTaskIds.has(key))return fail("reused-source-task-id");
        if(manifest.historyBoundary!==historyBoundary)return fail("wrong-creation-boundary");
        if(manifest.fields.length!==wCols.size||manifest.fields.some(f=>!wCols.has(f)))return fail("incomplete-create-coverage");
      }
      const snapshot:Snapshot={};
      for(const f of manifest.fields){
        const col=wCols.get(f);if(col===undefined)return fail("missing-wbs-column");
        snapshot[f]=snapshotValue(row.getCell(col),f);
      }
      current.set(id,snapshot);
    }
    for(const key of newTasks)if(!seen.has(key))return fail("missing-created-task");
    for(const key of originalIds)if(!seen.has(key))return fail("missing-original-task");
    return validateTypedB2Groups([...allGroups.values()],edits,current,priorEventIds);
  }catch(error){return {ok:false,errors:[error instanceof Error?error.message:"invalid-workbook"]};}
}
