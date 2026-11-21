import ExcelJS from "exceljs";
import {verifyB2WorkbookReadback} from "./b2WorkbookReadback";
import {B2_CREATE_FIELDS,type B2CreateField} from "./b2CreateAuditPlan";
import {MANIFEST_FIELD,parseCreateManifest} from "./b2ContinuityProof";
import {readManagedHistoryWithPresence,type HistoryEvent} from "./history";
import {todayInTimeZone} from "../calendar/dateOnly";
import {reportUtcRange} from "./reports";

export type CreationHistory = Readonly<{
 kind:"create";changeSetId:string;timestampUTC:string;taskId:string;taskTitle:string;wbsCode:string;
 actorLabel:string;actorProvenance:"UnverifiedLocal";source:"Web UI";appVersion:string;
 historyBoundary:number;sourceRow:number;fields:readonly Readonly<{field:B2CreateField;value:string;sourceRow:number;eventId:string}>[];
}>;
export type CombinedHistoryEntry=CreationHistory|Readonly<{kind:"edit";event:HistoryEvent}>;
export type HistoryInstant=Readonly<{timestampUTC:string;entries:readonly CombinedHistoryEntry[];crossSourceTie:boolean}>;
const reject=(s:string):never=>{throw Error(s);};
async function open(bytes:Uint8Array){
 const b=new ExcelJS.Workbook();await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);return b;
}

/** Candidate-only projection. A verified predecessor is required to prove the
 * preserved audit prefix. The live 0.1.2 History/Reports readers are unchanged.
 * Equal UTC instants are grouped rather than inventing cross-sheet ordering. */
export async function prepareCombinedHistoryProof(before:Uint8Array,after:Uint8Array){
 const original=await open(before),candidate=await open(after);
 const verified=verifyB2WorkbookReadback(original,candidate);
 if(!verified.ok)return reject("invalid-b2-history: "+verified.errors.join("; "));
 const audit=candidate.getWorksheet("ProjectAudit");
 if(!audit)return reject("missing-project-audit");
 const columns=new Map<string,number>();
 audit.getRow(1).eachCell({includeEmpty:false},(cell,index)=>{
   if(typeof cell.value!=="string")return reject("invalid-audit-header");
   const key=cell.value.trim().toLowerCase();
   if(columns.has(key))return reject("duplicate-audit-header");
   columns.set(key,index);
 });
 const groups=new Map<string,{manifest:ExcelJS.Row|null;rows:ExcelJS.Row[]}>();
 const value=(row:ExcelJS.Row,field:string)=>{
   const c=columns.get(field.toLowerCase());
   if(c===undefined)return reject("missing-audit-column:"+field);
   return row.getCell(c).value;
 };
 const text=(row:ExcelJS.Row,field:string,blank=false)=>{
   const v=value(row,field);
   if(blank&&v===null)return "";
   if(typeof v!=="string"||(!blank&&!v.trim()))return reject("invalid-audit-text:"+field);
   return v;
 };
 audit.eachRow({includeEmpty:false},(row,index)=>{
   if(index===1||value(row,"EntityType")!=="Task"||value(row,"Action")!=="Create")return;
   const task=text(row,"TaskID"),group=groups.get(task)??{manifest:null,rows:[]};
   if(text(row,"Field")===MANIFEST_FIELD){
     if(group.manifest)return reject("duplicate-manifest");
     group.manifest=row;
   }else group.rows.push(row);
   groups.set(task,group);
 });
 const created:CreationHistory[]=[];
 for(const [taskId,group] of groups){
   const m=group.manifest;if(!m)return reject("missing-manifest");
   const manifest=parseCreateManifest(text(m,"NewValue"));
   if(!manifest)return reject("invalid-manifest");
   const fields=group.rows.map(row=>{
     const field=text(row,"Field") as B2CreateField;
     if(!B2_CREATE_FIELDS.includes(field))return reject("unsupported-field");
     return {field,value:text(row,"NewValue",true),sourceRow:row.number,eventId:text(row,"EventID")};
   });
   const find=(field:B2CreateField)=>fields.find(r=>r.field===field)?.value??reject("missing-field:"+field);
   created.push({kind:"create",changeSetId:text(m,"ChangeSetID"),timestampUTC:text(m,"TimestampUTC"),taskId,
     taskTitle:find("Title"),wbsCode:find("WBSCode"),actorLabel:text(m,"ActorLabel"),actorProvenance:"UnverifiedLocal",
     source:"Web UI",appVersion:text(m,"AppVersion"),historyBoundary:manifest.historyBoundary,sourceRow:m.number,fields});
 }
 const history=await readManagedHistoryWithPresence(after);
 const instants=new Map<string,CombinedHistoryEntry[]>();
 const add=(stamp:string,entry:CombinedHistoryEntry)=>{
   if(!Number.isFinite(Date.parse(stamp)))return reject("invalid-history-time");
   const list=instants.get(stamp)??[];list.push(entry);instants.set(stamp,list);
 };
 for(const event of created.sort((a,b)=>b.sourceRow-a.sourceRow))add(event.timestampUTC,event);
 for(const event of [...history.events].sort((a,b)=>Math.max(...b.changes.map(c=>c.row))-Math.max(...a.changes.map(c=>c.row))))
   add(event.timestampUTC,{kind:"edit",event});
 return [...instants.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([timestampUTC,entries]):HistoryInstant=>
   ({timestampUTC,entries,crossSourceTie:entries.some(e=>e.kind==="create")&&entries.some(e=>e.kind==="edit")}));
}

/** Report projection retains detailed audit evidence while counting one logical
 * Create per task, and one logical save per distinct transaction. */
export function buildCombinedHistoryReport(instants:readonly HistoryInstant[],startDay:string,endDay:string,timeZone:string){
 const {startMs,endExclusiveMs}=reportUtcRange(startDay,endDay,timeZone);
 const days=new Map<string,HistoryInstant[]>(),saves=new Set<string>(),tasks=new Set<string>();
 let creations=0,edits=0,fieldRows=0;
 for(const instant of instants){
   const ms=Date.parse(instant.timestampUTC);
   if(ms<startMs||ms>=endExclusiveMs)continue;
   const day=todayInTimeZone(new Date(ms),timeZone),items=days.get(day)??[];
   items.push(instant);days.set(day,items);
   for(const e of instant.entries){
     if(e.kind==="create"){
       creations++;saves.add(e.changeSetId.toLowerCase());tasks.add(e.taskId);fieldRows+=e.fields.length;
     }else{
       edits++;saves.add(e.event.changeSetId.toLowerCase());
       for(const c of e.event.changes){tasks.add(c.taskId);fieldRows++;}
     }
   }
 }
 return {days:[...days.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([localDay,instants])=>({localDay,instants})),
   creations,edits,logicalSaves:saves.size,distinctTasks:tasks.size,fieldRows};
}
