import { B2_CREATE_FIELDS, type B2AuditRow, type B2CreateField } from "./b2CreateAuditPlan";
export const MANIFEST_FIELD="__TaskCreateManifestV1";
type Manifest={v:1;fields:B2CreateField[];historyBoundary:number};
type Row=Omit<B2AuditRow,"Field">&{Field:B2CreateField|typeof MANIFEST_FIELD};
type Edit={TaskID:string;ChangeSetID:string;TimestampUTC:string;Field:B2CreateField;OldValue:string;NewValue:string};
const required=["ID","TaskType","Title","WBSCode"];
const allowed=new Set<string>(B2_CREATE_FIELDS);
const editable=new Set<string>(["Title","AssignedTo","TaskStatus","Progress","PlannedStart","PlannedEnd","Priority","Description","Updates","Workstream","WBSCode","ParentTaskID","TaskType"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const utc=(s:string)=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
export function parseCreateManifest(raw:string):Manifest|null{
 if(typeof raw!=="string"||raw.length>32767)return null;
 try{
  const m=JSON.parse(raw);
  if(!m||m.v!==1||!Array.isArray(m.fields)||!Number.isSafeInteger(m.historyBoundary)||m.historyBoundary<0)return null;
  if(m.fields.some((f:unknown)=>typeof f!=="string"||!allowed.has(f))||new Set(m.fields).size!==m.fields.length||required.some(f=>!m.fields.includes(f)))return null;
  const candidate:Manifest={v:1,fields:[...m.fields].sort(),historyBoundary:m.historyBoundary};
  return JSON.stringify(candidate)===raw?candidate:null;
 }catch{return null;}
}
export function encodeCreateManifest(fields:readonly B2CreateField[],historyBoundary:number):string{
 const raw=JSON.stringify({v:1,fields:[...fields].sort(),historyBoundary});
 if(!parseCreateManifest(raw))throw new Error("Invalid Create manifest");
 return raw;
}
/** Candidate proof over canonical strings, not a complete typed workbook validator.
 * Caller must provide all physical nonempty history rows in append order.
 * No schema activation, workbook writes, or legacy-history repair. */
export function validateTaskContinuity(group:readonly Row[],history:readonly Edit[],
 current:Partial<Record<B2CreateField,string>>){
 const errors:string[]=[];
 const manifests=group.filter(r=>r.Field===MANIFEST_FIELD);
 if(manifests.length!==1)return {ok:false,errors:["manifest-count"]};
 const m=parseCreateManifest(manifests[0].NewValue);
 if(!m)return {ok:false,errors:["invalid-manifest"]};
 const root=manifests[0], id=root.TaskID;
 if(!uuid.test(id)||!uuid.test(root.ChangeSetID)||!utc(root.TimestampUTC))errors.push("invalid-create-identity");
 if(m.historyBoundary>history.length)errors.push("boundary-outside-history");
 const seen=new Set<string>(), fields=new Map<string,string>();
 for(const r of group){
  if(!uuid.test(r.EventID)||seen.has(r.EventID.toLowerCase()))errors.push("invalid-or-duplicate-event");
  seen.add(r.EventID.toLowerCase());
  if(r.TaskID!==id||r.EntityID!==id||r.ChangeSetID!==root.ChangeSetID||r.TimestampUTC!==root.TimestampUTC||
    r.EntityType!=="Task"||r.Action!=="Create"||r.OldValue!==""||r.ActorLabel!==root.ActorLabel||
    r.ActorProvenance!==root.ActorProvenance||r.Source!==root.Source||r.AppVersion!==root.AppVersion)errors.push("group-mismatch");
  if(r.Field===MANIFEST_FIELD)continue;
  if(fields.has(r.Field)||!m.fields.includes(r.Field))errors.push("unexpected-or-duplicate-field");
  fields.set(r.Field,r.NewValue);
 }
 if(m.fields.some(f=>!fields.has(f)))errors.push("missing-field");
 if(fields.get("ID")!==id)errors.push("snapshot-id-mismatch");
 let lastTimestamp=root.TimestampUTC,lastBlock:string|null=null;
 const closed=new Set<string>(), transitions=new Set<string>();
 for(let i=0;i<history.length;i++){
  const e=history[i];
  if(e.ChangeSetID!==lastBlock){
   if(lastBlock!==null)closed.add(lastBlock);
   lastBlock=e.ChangeSetID;transitions.clear();
  }
  if(e.TaskID!==id)continue;
  if(i<m.historyBoundary)errors.push("edit-in-prefix");
  if(!uuid.test(e.ChangeSetID)||e.ChangeSetID===root.ChangeSetID||closed.has(e.ChangeSetID))errors.push("invalid-edit-block");
  if(!utc(e.TimestampUTC)||e.TimestampUTC<lastTimestamp)errors.push("timestamp-regression");
  lastTimestamp=e.TimestampUTC;
  if(transitions.has(e.Field))errors.push("duplicate-transition");
  transitions.add(e.Field);
  if(!editable.has(e.Field)||!fields.has(e.Field)||fields.get(e.Field)!==e.OldValue)errors.push("invalid-transition");
  else fields.set(e.Field,e.NewValue);
 }
 for(const f of m.fields)if(current[f]!==fields.get(f))errors.push("current-value-mismatch:"+f);
 return {ok:errors.length===0,errors};
}
