import ExcelJS from "exceljs";
import {prepareBlankProject,STARTER_WBS_HEADERS,type BlankProjectInput} from "./blankProjectCandidate";
import {planB2TaskCreateAudit,type B2CreateField,type B2SnapshotValue} from "./b2CreateAuditPlan";
import {encodeCreateManifest,MANIFEST_FIELD} from "./b2ContinuityProof";
import {verifyB2WorkbookReadback} from "./b2WorkbookReadback";
import {prepareStarterTemplate,type StarterTemplateId} from "./starterProjectTemplates";
import type {prepareGuidedPreview} from "./guidedImportReader";
import {importWorkbook} from "../data/normalize";

type Snapshot=Record<B2CreateField,B2SnapshotValue>;
type GuidedPreview=ReturnType<typeof prepareGuidedPreview>;
type Request={project:BlankProjectInput;createChangeSetId:string;generateEventId?:()=>string}
 & ({route:"template";templateId:StarterTemplateId;milestoneDate?:string;generateTaskId?:()=>string}
 | {route:"import";preview:GuidedPreview});
const auditHeaders=["EventID","ChangeSetID","TimestampUTC","EntityType","EntityID","TaskID","Action","Field","OldValue","NewValue","ActorLabel","ActorProvenance","Source","AppVersion"] as const;
const fields=STARTER_WBS_HEADERS;
const fail=(reason:string):never=>{throw new Error(reason);};
async function reopen(bytes:Uint8Array){
 const book=new ExcelJS.Workbook();
 await book.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
 return book;
}

/** Isolated 0.1.3 candidate proof for synthetic tests only. Never imported by
 * the active app or Save layer. No persistence, download, activation or migration.
 * The accepted managed inspector/writer remain on 0.1.2. */
export async function preparePopulatedProjectProof(request:Request){
 const snapshots:Snapshot[]=[];
 if(request.route==="template"){
   const prepared=prepareStarterTemplate(request.templateId,request.milestoneDate,request.generateTaskId);
   if(!prepared.ok)return fail(prepared.errors.join("; "));
   for(const d of prepared.drafts)snapshots.push({
     ID:d.id,Title:d.title,WBSCode:d.wbsCode,TaskType:d.taskType,ParentTaskID:d.parentId,
     PlannedStart:d.plannedStart,PlannedEnd:d.plannedEnd,Progress:null,TaskStatus:d.sourceTaskStatus,
     AssignedTo:d.owner||null,Workstream:d.workstream||null,PredecessorIDs:d.predecessorIds,
     Priority:null,Description:null,Updates:null,SortOrder:null,Modified:null,ItemURL:null,
   });
 }else{
   const p=request.preview;
   if(!p.corePreviewValid||!p.targetIdentity?.ok)return fail("guided-review-not-valid");
   const identities=new Map(p.targetIdentity.identities.map(x=>[x.sourceRow,x]));
   if(identities.size!==p.normalized.drafts.length)return fail("identity-coverage");
   for(const d of p.normalized.drafts){
     const target=identities.get(d.sourceRow);if(!target)return fail("missing-target-identity");
     snapshots.push({
       ID:target.id,Title:d.title,WBSCode:d.wbsCode,TaskType:d.taskType,ParentTaskID:target.parentId,
       PlannedStart:d.plannedStart,PlannedEnd:d.plannedEnd,Progress:d.progress,TaskStatus:d.status,
       AssignedTo:d.owner||null,Workstream:d.workstream||null,PredecessorIDs:target.predecessorIds,
       Priority:d.priority,Description:d.description,Updates:d.updates,SortOrder:d.sortOrder,Modified:d.modified,ItemURL:d.itemUrl,
     });
   }
 }
 if(!snapshots.length||request.project.changeSetId.toLowerCase()===request.createChangeSetId.toLowerCase())
   return fail("empty-or-reused-create-transaction");
 const ids=new Set(snapshots.map(s=>String(s.ID).toLowerCase()));
 if(ids.size!==snapshots.length)return fail("duplicate-target-id");
 for(const s of snapshots){
   if(s.ParentTaskID!==null&&!ids.has(String(s.ParentTaskID).toLowerCase()))return fail("missing-parent");
   if(!Array.isArray(s.PredecessorIDs)||s.PredecessorIDs.some(id=>!ids.has(id.toLowerCase())))return fail("missing-predecessor");
 }
 const blank=await prepareBlankProject(request.project),original=await reopen(blank.bytes),candidate=await reopen(blank.bytes);
 const meta=candidate.getWorksheet("ProjectMeta")!,wbs=candidate.getWorksheet("ProjectWBS")!,audit=candidate.getWorksheet("ProjectAudit")!;
 let versionFound=false;
 meta.eachRow(row=>{
   if(row.getCell(1).value==="ProjectDataSchemaVersion"){
     if(versionFound||row.getCell(2).value!=="0.1.2")fail("unexpected-base-version");
     row.getCell(2).value="0.1.3";versionFound=true;
   }
 });
 if(!versionFound)return fail("missing-version");
 const generate=request.generateEventId??(()=>crypto.randomUUID());
 audit.addRow([generate(),request.createChangeSetId,request.project.timestampUTC,"ProjectMeta","ProjectDataSchemaVersion",null,
   "Update","ProjectDataSchemaVersion","0.1.2","0.1.3",request.project.actorLabel,"UnverifiedLocal","Web UI",request.project.appVersion]);
 for(const s of snapshots){
   const taskId=String(s.ID);
   const p=planB2TaskCreateAudit({
     taskId,changeSetId:request.createChangeSetId,timestampUTC:request.project.timestampUTC,
     actorLabel:request.project.actorLabel,appVersion:request.project.appVersion,fields,
     values:s,eventIds:fields.map(()=>generate()),
   });
   if(!p.ok)return fail(p.errors.join("; "));
   const rows=[...p.rows,{...p.rows[0],EventID:generate(),Field:MANIFEST_FIELD,NewValue:encodeCreateManifest(fields,0)}];
   for(const row of rows)audit.addRow(auditHeaders.map(h=>row[h]));
   wbs.addRow(fields.map(f=>{
     const v=s[f];return typeof v==="string"||typeof v==="number"||v===null?v:v.join(";");
   }));
 }
 const bytes=new Uint8Array(await candidate.xlsx.writeBuffer()),after=await reopen(bytes);
 const proof=verifyB2WorkbookReadback(original,after);
 if(!proof.ok)return fail("readback: "+proof.errors.join("; "));
 const read=await importWorkbook(bytes,{paletteStorage:null});
 if(!read.ok||read.tasks.length!==snapshots.length)return fail("domain-readback");
 for(const s of snapshots){
   const task=read.tasks.find(t=>t.id===s.ID);
   if(!task||task.taskName!==s.Title||task.wbsCode!==s.WBSCode||task.taskType!==s.TaskType||
      task.parentId!==s.ParentTaskID||JSON.stringify(task.predecessorIds)!==JSON.stringify(s.PredecessorIDs))
     return fail("domain-relationship-readback");
 }
 return {kind:"synthetic-populated-proof" as const,taskCount:read.tasks.length,
   auditRows:snapshots.length*(fields.length+1),schemaVersion:"0.1.3" as const,persistenceReady:false as const,bytes};
}
