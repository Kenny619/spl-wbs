import ExcelJS from "exceljs";
import {prepareNewEntity,type NewEntityInput} from "./creationDraft";
import {B2_CREATE_FIELDS,planB2TaskCreateAudit,type B2CreateField,type B2SnapshotValue} from "./b2CreateAuditPlan";
import {encodeCreateManifest,MANIFEST_FIELD} from "./b2ContinuityProof";
import {verifyB2WorkbookReadback} from "./b2WorkbookReadback";
import {verifyPhysicalPrefix} from "./b2TypedProof";
import {mapB2WbsColumns} from "./b2HeaderMapping";
import {inspectProjectData} from "./projectDataInspector";
import {preflightManagedWorkbook} from "./preflight";
import {importWorkbook} from "../data/normalize";

type Request={source:Uint8Array;draft:NewEntityInput;taskId:string;changeSetId:string;timestampUTC:string;
 actorLabel:string;appVersion:string;generateEventId?:()=>string};
const auditFields=["EventID","ChangeSetID","TimestampUTC","EntityType","EntityID","TaskID","Action","Field","OldValue","NewValue","ActorLabel","ActorProvenance","Source","AppVersion"] as const;
const fail=(s:string):never=>{throw Error(s);};
async function open(bytes:Uint8Array){
 const b=new ExcelJS.Workbook();await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);return b;
}
function physical(s:ExcelJS.Worksheet|undefined){
 if(!s)return [];
 const out:unknown[][]=[];
 s.eachRow({includeEmpty:false},row=>{
   const cells:unknown[]=[];for(let c=1;c<=s.columnCount;c++)cells.push(row.getCell(c).value);out.push(cells);
 });return out;
}
function sameRows(a:unknown[][],b:unknown[][]){return a.length===b.length&&verifyPhysicalPrefix(a,b);}
function positions(s:ExcelJS.Worksheet){
 const headers=new Map<string,number>();
 s.getRow(1).eachCell({includeEmpty:false},(c,i)=>{
   if(typeof c.value!=="string"||headers.has(c.value))return fail("noncanonical-header");
   headers.set(c.value,i);
 });return headers;
}
/** Synthetic, non-persisting first-Create proof for a verified 0.1.2 workbook.
 * No production schema activation, no migration of real data, no Save adapter.
 * Recognized native WBS aliases map to canonical audit fields without renaming columns. */
export async function prepareExistingEntityProof(input:Request){
 const source=input.source.slice();
 await preflightManagedWorkbook(source);
 const original=await open(source);
 if(inspectProjectData(original).kind!=="valid")return fail("unsupported-source-project");
 const domain=await importWorkbook(source,{paletteStorage:null});
 if(!domain.ok)return fail("invalid-source-wbs");
 const prepared=prepareNewEntity(input.draft,domain.tasks,input.taskId);
 if(!prepared.ok)return fail(prepared.errors.join("; "));
 const d=prepared.draft;
 const book=await open(source),wbs=book.getWorksheet("ProjectWBS")!,audit=book.getWorksheet("ProjectAudit")!,meta=book.getWorksheet("ProjectMeta")!;
 if(!wbs||!audit||!meta)return fail("missing-canonical-sheets");
 const h=mapB2WbsColumns(wbs),ah=positions(audit);
 if(auditFields.some(f=>!ah.has(f)))return fail("unsupported-header");
 const fields=[...h.keys()];
 const snapshot:Record<B2CreateField,B2SnapshotValue>={
   ID:d.id,Title:d.title,WBSCode:d.wbsCode,TaskType:d.taskType,ParentTaskID:d.parentId,
   PlannedStart:d.plannedStart,PlannedEnd:d.plannedEnd,Progress:null,TaskStatus:d.sourceTaskStatus,
   AssignedTo:d.owner||null,Workstream:d.workstream||null,PredecessorIDs:d.predecessorIds,
   Priority:null,Description:null,Updates:null,SortOrder:null,Modified:null,ItemURL:null,
 };
 for(const f of B2_CREATE_FIELDS){
   const value=snapshot[f];
   if(!h.has(f)&&value!==null&&value!==""&&!(Array.isArray(value)&&value.length===0)&&f!=="TaskStatus")
     return fail("requested-field-absent:"+f);
 }
 const history=book.getWorksheet("UpdateHistory");
 const boundary=physical(history).length-(history?1:0);
 const tx=input.changeSetId.toLowerCase();
 for(const s of [audit,history]){
   if(!s)continue;
   const c=positions(s).get("ChangeSetID");if(c===undefined)return fail("missing-transaction-header");
   s.eachRow({includeEmpty:false},(row,i)=>{
     if(i>1&&String(row.getCell(c).value??"").toLowerCase()===tx)fail("reused-change-set");
   });
 }
 const generate=input.generateEventId??(()=>crypto.randomUUID());
 const values=Object.fromEntries(fields.map(f=>[f,snapshot[f]]));
 const plan=planB2TaskCreateAudit({taskId:d.id,changeSetId:input.changeSetId,timestampUTC:input.timestampUTC,
   actorLabel:input.actorLabel,appVersion:input.appVersion,fields,values,eventIds:fields.map(()=>generate())});
 if(!plan.ok)return fail(plan.errors.join("; "));
 const appendAudit=(values:Record<string,unknown>)=>{
   const row=audit.addRow([]);
   for(const f of auditFields)row.getCell(ah.get(f)!).value=(values[f]??null) as ExcelJS.CellValue;
 };
 let versionRows=0;
 meta.eachRow(row=>{
   if(row.getCell(1).value==="ProjectDataSchemaVersion"){
     if(row.getCell(2).value!=="0.1.2")fail("unexpected-version");
     row.getCell(2).value="0.1.3";versionRows++;
   }
 });
 if(versionRows!==1)return fail("missing-version");
 appendAudit({EventID:generate(),ChangeSetID:input.changeSetId,TimestampUTC:input.timestampUTC,
   EntityType:"ProjectMeta",EntityID:"ProjectDataSchemaVersion",TaskID:null,Action:"Update",Field:"ProjectDataSchemaVersion",
   OldValue:"0.1.2",NewValue:"0.1.3",ActorLabel:input.actorLabel,ActorProvenance:"UnverifiedLocal",Source:"Web UI",AppVersion:input.appVersion});
 for(const row of [...plan.rows,{...plan.rows[0],EventID:generate(),Field:MANIFEST_FIELD,NewValue:encodeCreateManifest(fields,boundary)}])appendAudit(row);
 const newRow=wbs.addRow([]);
 for(const f of fields){
   const v=snapshot[f];newRow.getCell(h.get(f)!).value=typeof v==="string"||typeof v==="number"||v===null?v:v.join(";");
 }
 const bytes=new Uint8Array(await book.xlsx.writeBuffer()),after=await open(bytes);
 const proof=verifyB2WorkbookReadback(original,after);
 if(!proof.ok)return fail("readback: "+proof.errors.join("; "));
 if(!verifyPhysicalPrefix(physical(original.getWorksheet("ProjectWBS")),physical(after.getWorksheet("ProjectWBS"))))
   return fail("prior-wbs-changed");
 for(const name of ["WatchReasons","ProjectCalendar","ProjectCommitments","UpdateHistory"])
   if(!sameRows(physical(original.getWorksheet(name)),physical(after.getWorksheet(name))))return fail("prior-sheet-changed:"+name);
 const expectedMeta=physical(original.getWorksheet("ProjectMeta")).map(row=>row[0]==="ProjectDataSchemaVersion"?[row[0],"0.1.3"]:row);
 if(!sameRows(expectedMeta,physical(after.getWorksheet("ProjectMeta"))))return fail("unexpected-meta-change");
 const result=await importWorkbook(bytes,{paletteStorage:null});
 if(!result.ok||result.tasks.length!==domain.tasks.length+1)return fail("invalid-domain-readback");
 const newTask=result.tasks.find(t=>t.id===d.id);
 if(!newTask||newTask.taskName!==d.title||newTask.wbsCode!==d.wbsCode||newTask.taskType!==d.taskType||
   newTask.parentId!==d.parentId||JSON.stringify(newTask.predecessorIds)!==JSON.stringify(d.predecessorIds))return fail("new-entity-mismatch");
 return {kind:"synthetic-entity-proof" as const,taskId:d.id,taskCount:result.tasks.length,taskAuditRows:fields.length+1,
   schemaVersion:"0.1.3" as const,persistenceReady:false as const,bytes};
}
