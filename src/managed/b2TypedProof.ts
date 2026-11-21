import { B2_CREATE_FIELDS, planB2TaskCreateAudit, type B2CreateField, type B2SnapshotValue } from "./b2CreateAuditPlan";
import { KNOWN_STATUSES, TASK_TYPES } from "../data/types";
import { sanitizeItemUrl } from "../data/normalize";
import { SHAREPOINT_HOSTS } from "../config/decisions";
import { MANIFEST_FIELD, parseCreateManifest, validateTaskContinuity } from "./b2ContinuityProof";

type CreateRow = Parameters<typeof validateTaskContinuity>[0][number];
type Edit = Parameters<typeof validateTaskContinuity>[1][number];
type TypedEdit = Omit<Edit,"OldValue"|"NewValue"> & { OldValue:unknown; NewValue:unknown };
type Snapshot = Partial<Record<B2CreateField,B2SnapshotValue>>;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const allowed = new Set<string>(B2_CREATE_FIELDS);
const numeric = new Set<string>(["Progress","SortOrder"]);
const required = new Set<string>(["ID","Title","WBSCode","TaskType"]);
const normalizeId = (id:string) => id.toLowerCase();

/** Interpret audit wire text strictly; no object coercion or implicit number
 * parsing of physical WBS/history cells. Create numeric values are encoded as
 * canonical decimal text; UpdateHistory numeric values are physical numbers. */
function decodeCreate(field:B2CreateField, raw:unknown): B2SnapshotValue | undefined {
  if(typeof raw!=="string") return undefined;
  if(raw==="") return required.has(field) || field==="PredecessorIDs" ? undefined : null;
  if(numeric.has(field)){
    const n=Number(raw);
    return Number.isFinite(n) && String(n)===raw ? n : undefined;
  }
  if(field==="PredecessorIDs"){
    try {
      const ids:unknown=JSON.parse(raw);
      return Array.isArray(ids) && ids.every(x=>typeof x==="string") && JSON.stringify(ids)===raw
        ? ids : undefined;
    }catch{return undefined;}
  }
  return raw;
}

function encode(field:B2CreateField,value:unknown,id:string):string|undefined{
  if(value===null)return required.has(field)?undefined:field==="PredecessorIDs"?"[]":"";
  if(field==="PredecessorIDs"){
    if(!Array.isArray(value) || value.some(x=>typeof x!=="string" || !x.trim() || x.trim()!==x))return undefined;
    const keys=value.map(x=>UUID.test(x)?normalizeId(x):x);
    if(keys.includes(normalizeId(id))||new Set(keys).size!==keys.length)return undefined;
    const json=JSON.stringify(value);return json.length<=32767?json:undefined;
  }
  if(numeric.has(field)){
    if(typeof value!=="number" || !Number.isFinite(value) || (field==="Progress"&&(value<0||value>100)))return undefined;
    return String(value);
  }
  if(typeof value!=="string"||value.length>32767||/[\u0000-\u0008\u000b-\u001f\u007f]/u.test(value)||/^[=+\-@]/.test(value.trimStart())||
    (required.has(field)&&!value.trim()))return undefined;
  if(field==="ID"&&value!==id)return undefined;
  if(field==="ParentTaskID"&&normalizeId(value)===normalizeId(id))return undefined;
  if(field==="PlannedStart"||field==="PlannedEnd"){
    if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+"T00:00:00Z"))||new Date(value+"T00:00:00Z").toISOString().slice(0,10)!==value))return undefined;
  }
  if(field==="TaskType"&&!TASK_TYPES.some(v=>v===value))return undefined;
  if(field==="TaskStatus"&&value&&!KNOWN_STATUSES.some(v=>v===value))return undefined;
  if(field==="ItemURL"&&value&&sanitizeItemUrl(value,SHAREPOINT_HOSTS)!==value)return undefined;
  if(field==="Modified"&&value&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value))return undefined;
  return value;
}

/** Candidate proof for B2 rows already extracted with their physical types.
 * No workbook reader/writer is activated. Noncanonical or unsupported values
 * prevent a successful proof; legacy tasks outside these groups are untouched. */
export function validateTypedB2Groups(groups:readonly (readonly CreateRow[])[],history:readonly TypedEdit[],
  current: ReadonlyMap<string,Snapshot>, priorEventIds:readonly string[]=[]){
  const errors:string[]=[];
  const seenEvents=new Set<string>(), seenTasks=new Set<string>();
  for(const id of priorEventIds){const key=normalizeId(id);if(!UUID.test(id)||seenEvents.has(key))errors.push("duplicate-or-invalid-prior-event");seenEvents.add(key);}
  const blockTimes=new Map<string,string>();
  const createTransactions=new Map<string,string>();
  for(const row of history){
    const key=normalizeId(row.ChangeSetID), known=blockTimes.get(key);
    if(known!==undefined && known!==row.TimestampUTC)errors.push("inconsistent-edit-block-time");
    blockTimes.set(key,row.TimestampUTC);
  }
  for(const group of groups){
    const root=group.find(r=>r.Field===MANIFEST_FIELD);
    const manifest=root&&parseCreateManifest(root.NewValue);
    if(!root||!manifest){errors.push("invalid-manifest");continue;}
    const id=root.TaskID, key=normalizeId(id);
    if(!UUID.test(id) || seenTasks.has(key))errors.push("duplicate-or-invalid-create-task");
    seenTasks.add(key);
    const transaction=normalizeId(root.ChangeSetID);
    const metadata=JSON.stringify([root.ChangeSetID,root.TimestampUTC,root.ActorLabel,root.ActorProvenance,root.Source,root.AppVersion,manifest.historyBoundary]);
    const previous=createTransactions.get(transaction);
    if(previous!==undefined&&previous!==metadata)errors.push("inconsistent-create-transaction");
    if(blockTimes.has(transaction))errors.push("create-edit-id-reuse");
    createTransactions.set(transaction,metadata);
    const snapshot=current.get(id);
    if(!snapshot){errors.push("missing-current-task");continue;}
    const values:Snapshot={}, eventIds:string[]=[];
    for(const row of group){
      const e=normalizeId(row.EventID);
      if(!UUID.test(row.EventID)||seenEvents.has(e))errors.push("duplicate-or-invalid-event");
      seenEvents.add(e);
    }
    for(const field of manifest.fields){
      const rows=group.filter(r=>r.Field===field);
      if(rows.length!==1){errors.push("invalid-field-count:"+field);continue;}
      const row=rows[0], value=decodeCreate(field,row.NewValue);
      if(value===undefined||encode(field,value,id)!==row.NewValue){errors.push("invalid-create-value:"+field);continue;}
      values[field]=value;eventIds.push(row.EventID);
    }
    const planned=planB2TaskCreateAudit({taskId:id,changeSetId:root.ChangeSetID,timestampUTC:root.TimestampUTC,
      actorLabel:root.ActorLabel,appVersion:root.AppVersion,fields:manifest.fields,values,eventIds});
    if(!planned.ok)errors.push("invalid-create-plan");
    if(root.ActorProvenance!=="UnverifiedLocal"||root.Source!=="Web UI")errors.push("invalid-provenance");
    const encodedCurrent:Partial<Record<B2CreateField,string>>={};
    for(const field of manifest.fields){
      const result=encode(field,snapshot[field],id);
      if(result===undefined){errors.push("invalid-current-value:"+field);continue;}
      encodedCurrent[field]=result;
    }
    const edits:Edit[]=[];
    for(const row of history){
      if(normalizeId(row.TaskID)!==key){
        // Preserve physical row/block position without interpreting unrelated legacy values.
        edits.push({...row,OldValue:"",NewValue:""});continue;
      }
      if(row.TaskID!==id||!allowed.has(row.Field))errors.push("noncanonical-edit-identity-or-field");
      const old=encode(row.Field,row.OldValue,id), next=encode(row.Field,row.NewValue,id);
      if(old===undefined||next===undefined){errors.push("invalid-edit-value:"+row.Field);}
      edits.push({...row,OldValue:old??"",NewValue:next??""});
    }
    const replay=validateTaskContinuity(group,edits,encodedCurrent);
    errors.push(...replay.errors);
    // Reject UUID aliases in Edit ChangeSetIDs to avoid bypassing the existing
    // physical-block check with casing changes.
    const blockIds=new Map<string,string>(); for(const row of edits){
      const k=normalizeId(row.ChangeSetID), previous=blockIds.get(k);
      if(previous!==undefined&&previous!==row.ChangeSetID)errors.push("ambiguous-edit-block-id");
      blockIds.set(k,row.ChangeSetID);
      if(normalizeId(row.TaskID)===key && k===normalizeId(root.ChangeSetID))errors.push("create-edit-id-reuse");
    }
  }
  return {ok:errors.length===0,errors};
}

/** Compare exact prior nonempty physical rows including every supplied column,
 * preserving scalar type and date identity; unsupported cell objects fail closed.
 * Callers must extract complete physical rows without projection or coercion.
 * This is not a cryptographic authenticity guarantee. */
export function verifyPhysicalPrefix(original:readonly (readonly unknown[])[],candidate:readonly (readonly unknown[])[]){
  const canonical=(v:unknown):string|undefined=>{
    if(v===null)return "null";
    if(typeof v==="string")return "s:"+v;
    if(typeof v==="number"&&Number.isFinite(v))return "n:"+String(v);
    if(typeof v==="boolean")return "b:"+String(v);
    if(v instanceof Date&&Number.isFinite(v.getTime()))return "d:"+v.toISOString();
    return undefined;
  };
  if(candidate.length<original.length)return false;
  return original.every((row,i)=>row.length===candidate[i].length && row.every((value,j)=>{
    const a=canonical(value),b=canonical(candidate[i][j]);return a!==undefined&&a===b;
  }));
}
